import { User } from '../models/User.js';
import { generateWithGroq } from '../config/grok.js';
import crypto from 'crypto';

// 1. Get classmates (Fixed for Personal Users)
export const getClassmates = async (req, res, next) => {
  try {
    const currentUser = req.user;
    
    // Personal users don't have classmates, return empty array
    if (currentUser.role === 'personal_user') {
      return res.status(200).json({ success: true, data: [] });
    }

    const filter = { role: 'student', _id: { $ne: currentUser._id }, isActive: true };
    if (currentUser.className) {
      filter.className = currentUser.className;
    } else if (currentUser.schoolName && currentUser.schoolName !== 'Global') {
      filter.schoolName = currentUser.schoolName;
    }

    const classmates = await User.find(filter).select('fullName xp level').sort({ xp: -1 }).limit(20);
    res.status(200).json({ success: true, data: classmates });
  } catch (error) { next(error); }
};

// 2. Challenge a specific classmate
export const challengeClassmate = async (req, res, next) => {
  try {
    const { opponentId, topic, numQuestions = 3 } = req.body;
    const challenger = req.user;
    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ success: false, message: "Opponent not found" });

    const prompt = `Generate exactly ${numQuestions} rapid-fire multiple-choice questions about "${topic || 'general academic knowledge'}". Output VALID JSON ONLY: {"questions": [{"question": "", "options": ["", "", "", ""], "correctAnswer": "", "explanation": ""}]}`;
    const rawResponse = await generateWithGroq([{ role: "user", content: prompt }]);
    
    let quizData;
    try {
      const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      quizData = JSON.parse(match[0]);
      if (!quizData.questions) throw new Error("Missing questions array");
    } catch (e) { 
      console.error("❌ Challenge JSON Parse Error:", e.message, rawResponse);
      return res.status(500).json({ success: false, message: "AI generation failed." }); 
    }

    opponent.pendingBattles.push({
      challengerId: challenger._id, challengerName: challenger.fullName,
      topic: topic || 'General Knowledge', questions: quizData.questions, status: 'pending'
    });
    await opponent.save();
    res.status(200).json({ success: true, message: `Challenge sent to ${opponent.fullName}!` });
  } catch (error) { next(error); }
};

// 3. Get pending battles
export const getMyBattles = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('pendingBattles');
    const pending = user.pendingBattles ? user.pendingBattles.filter(b => b.status === 'pending') : [];
    res.status(200).json({ success: true, data: pending });
  } catch (error) { next(error); }
};

// 4. Generate Challenge Link (With Detailed Logging)
export const generateChallengeLink = async (req, res, next) => {
  try {
    const { topic, numQuestions = 3 } = req.body;
    const currentUser = req.user;
    
    console.log(`🔍 Generating battle link. Topic: "${topic}", Questions: ${numQuestions}`);
    
    const prompt = `Generate exactly ${numQuestions} rapid-fire multiple-choice questions about "${topic || 'General Knowledge'}". Output VALID JSON ONLY: {"questions": [{"question": "", "options": ["", "", "", ""], "correctAnswer": "", "explanation": ""}]}`;
    const rawResponse = await generateWithGroq([{ role: "user", content: prompt }]);
    
    let quizData;
    try {
      const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in response");
      quizData = JSON.parse(match[0]);
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid JSON structure: missing 'questions' array");
      }
    } catch (e) {
      console.error("❌ JSON Parse Error:", e.message);
      console.error("Raw AI Response:", rawResponse);
      return res.status(500).json({ success: false, message: "AI generation failed: Invalid response format." });
    }

    const inviteCode = crypto.randomBytes(6).toString('hex');
    
    // ✅ SAFETY CHECK: Ensure pendingBattles array exists
    if (!currentUser.pendingBattles) {
      currentUser.pendingBattles = [];
    }
    
    currentUser.pendingBattles.push({
      challengerId: currentUser._id, 
      challengerName: currentUser.fullName,
      topic: topic || 'General Knowledge', 
      questions: quizData.questions, 
      status: 'pending', 
      inviteCode
    });
    
    await currentUser.save();
    console.log("✅ Battle successfully saved to database!");

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.status(200).json({ success: true, data: { battleLink: `${clientUrl}/battle-arena?invite=${inviteCode}`, inviteCode } });
  } catch (error) {
    console.error("❌ generateChallengeLink CRASH:", error);
    next(error);
  }
};

// 5. Accept Battle via Link or ID
export const acceptBattle = async (req, res, next) => {
  try {
    const { battleId, inviteCode } = req.body;
    let query = battleId ? { 'pendingBattles._id': battleId } : { 'pendingBattles.inviteCode': inviteCode };
    
    const opponentDoc = await User.findOne(query);
    if (!opponentDoc) return res.status(404).json({ success: false, message: "Battle not found" });

    const battle = battleId 
      ? opponentDoc.pendingBattles.id(battleId) 
      : opponentDoc.pendingBattles.find(b => b.inviteCode === inviteCode);

    if (!battle) return res.status(404).json({ success: false, message: "Battle not found" });
    if (String(opponentDoc._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot join your own battle." });
    }
    if (battle.status !== 'pending' && String(battle.opponentId) !== String(req.user._id)) {
      return res.status(409).json({ success: false, message: "This battle is no longer available." });
    }
    
    // ✅ CRITICAL FIX: Update status to 'joined' so the host's polling detects it!
    if (battle.status === 'pending') {
      battle.status = 'joined';
      battle.opponentId = req.user._id;
      await opponentDoc.save();
      console.log("✅ Guest joined! Status updated to 'joined'");
    }
    
    res.status(200).json({ 
      success: true, 
      data: { 
        battleId: battle._id, 
        challengerName: battle.challengerName, 
        topic: battle.topic, 
        questions: battle.questions, 
        status: battle.status 
      } 
    });
  } catch (error) { next(error); }
};

// 6. Check Battle Status
export const checkBattleStatus = async (req, res, next) => {
  try {
    const { battleId } = req.query;
    const user = await User.findById(req.user._id);
    
    let battle = user.pendingBattles ? user.pendingBattles.id(battleId) : null;
    if (!battle) {
      const opponentDoc = await User.findOne({ 'pendingBattles._id': battleId });
      if (opponentDoc) battle = opponentDoc.pendingBattles.id(battleId);
    }

    if (!battle) return res.status(404).json({ success: false, message: "Battle not found" });
    res.status(200).json({ success: true, data: { status: battle.status } });
  } catch (error) { next(error); }
};

// 7. Host Starts the Battle
export const startBattle = async (req, res, next) => {
  try {
    const { battleId } = req.body;
    const user = await User.findById(req.user._id);
    
    const battle = user.pendingBattles ? user.pendingBattles.id(battleId) : null;
    if (!battle) return res.status(404).json({ success: false, message: "Battle not found" });

    if (battle.status !== 'joined' || !battle.opponentId) {
      return res.status(409).json({ success: false, message: "A player must join before the battle can start." });
    }
    battle.status = 'active';
    await user.save();
    res.status(200).json({ success: true, message: "Battle started!" });
  } catch (error) { next(error); }
};

// 8. Resolve Battle (Award XP)
export const resolveBattle = async (req, res, next) => {
  try {
    const { battleId, opponentScore } = req.body;
    const score = Number(opponentScore);
    if (!Number.isInteger(score) || score < 0) {
      return res.status(400).json({ success: false, message: "A valid battle score is required." });
    }

    const owned = await User.findOne({ _id: req.user._id, 'pendingBattles._id': battleId });
    const owner = owned || await User.findOne({ 'pendingBattles._id': battleId });
    if (!owner) return res.status(404).json({ success: false, message: "Battle not found" });
    const battle = owner.pendingBattles.id(battleId);
    if (!battle || ![String(battle.challengerId), String(battle.opponentId)].includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: "You are not a participant in this battle." });
    }
    if (battle.status !== 'active') {
      return res.status(409).json({ success: false, message: "This battle has already been resolved or has not started." });
    }
    if (score > battle.questions.length) {
      return res.status(400).json({ success: false, message: "Battle score cannot exceed the number of questions." });
    }

    const isChallenger = String(battle.challengerId) === String(req.user._id);
    const scoreField = isChallenger ? 'pendingBattles.$.challengerScore' : 'pendingBattles.$.opponentScore';
    const completedOwner = await User.findOneAndUpdate(
      {
        _id: owner._id,
        pendingBattles: { $elemMatch: { _id: battleId, status: 'active' } },
      },
      { $set: { [scoreField]: score, 'pendingBattles.$.status': 'completed' } },
      { new: true }
    );
    if (!completedOwner) {
      return res.status(409).json({ success: false, message: "This battle has already been resolved." });
    }

    const completedBattle = completedOwner.pendingBattles.id(battleId);
    const userScore = score;
    const enemyScore = isChallenger ? completedBattle.opponentScore : completedBattle.challengerScore;

    const xpGained = userScore > enemyScore ? 50 : userScore === enemyScore ? 25 : 10;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { xp: xpGained } },
      { new: true }
    );
    updatedUser.level = Math.floor(updatedUser.xp / 100) + 1;
    await updatedUser.save();

    res.status(200).json({ success: true, data: { xpGained, newLevel: updatedUser.level, won: xpGained === 50 } });
  } catch (error) { next(error); }
};
