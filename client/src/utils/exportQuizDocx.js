import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const toText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeAnswer = (value) =>
  toText(value).trim().replace(/\s+/g, " ");

const sameText = (a, b) =>
  normalizeAnswer(a) === normalizeAnswer(b);

const optionLetter = (index) => {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
};

// Makes common mathematical notation more readable in Word.
// Complex LaTeX expressions may still appear as editable source text.
function formatWordText(value) {
  return toText(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\times\b/g, "×")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\div\b/g, "÷")
    .replace(/\\leq?\b/g, "≤")
    .replace(/\\geq?\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\pi\b/g, "π")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pm\b/g, "±")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getQuizMetadata(quiz, total) {
  const parts = [
    `${total} question${total === 1 ? "" : "s"}`,
  ];

  if (
    quiz?.timeLimit !== null &&
    quiz?.timeLimit !== undefined &&
    quiz.timeLimit !== ""
  ) {
    const unit = quiz.timeUnit || "minutes";
    const perQuestion =
      quiz.timeType === "perQuestion" ? " per question" : "";

    parts.push(`Time: ${quiz.timeLimit} ${unit}${perQuestion}`);
  }

  if (quiz?.difficulty) {
    parts.push(`Difficulty: ${quiz.difficulty}`);
  }

  if (quiz?.subject) {
    parts.push(`Subject: ${quiz.subject}`);
  }

  return parts.join("  |  ");
}

/**
 * Downloads a question image and embeds it into the Word document.
 * Unsupported image formats are converted to PNG where possible.
 */
async function createImageRun(imageUrl) {
  if (!imageUrl || typeof window === "undefined") {
    return null;
  }

  let objectUrl;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return null;
    }

    let blob = await response.blob();

    // Avoid embedding extremely large images.
    if (!blob.size || blob.size > 8 * 1024 * 1024) {
      return null;
    }

    objectUrl = URL.createObjectURL(blob);

    const image = new Image();
    image.src = objectUrl;

    await image.decode();

    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (!originalWidth || !originalHeight) {
      return null;
    }

    let mimeType = (
      blob.type || response.headers.get("content-type") || ""
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    const imageTypes = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/bmp": "bmp",
    };

    let imageType = imageTypes[mimeType];

    // Convert WebP and other browser-supported formats to PNG.
    if (!imageType) {
      const canvas = document.createElement("canvas");

      canvas.width = originalWidth;
      canvas.height = originalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        return null;
      }

      context.drawImage(image, 0, 0);

      const convertedBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!convertedBlob) {
        return null;
      }

      blob = convertedBlob;
      imageType = "png";
    }

    const scale = Math.min(
      1,
      460 / originalWidth,
      280 / originalHeight
    );

    const width = Math.max(
      1,
      Math.round(originalWidth * scale)
    );

    const height = Math.max(
      1,
      Math.round(originalHeight * scale)
    );

    const data = new Uint8Array(await blob.arrayBuffer());

    return new ImageRun({
      data,
      type: imageType,
      transformation: {
        width,
        height,
      },
    });
  } catch (error) {
    console.warn("Could not embed question image:", error);
    return null;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function addStudentInformation(children) {
  children.push(
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [
        new TextRun({
          text: "Name: ______________________________",
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Class: ______________________________",
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Date: _______________________________",
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: "Score: ______________________________",
          bold: true,
        }),
      ],
    })
  );
}

function addQuestionText(children, question, number) {
  const lines = formatWordText(question?.question)
    .split("\n")
    .filter(Boolean);

  if (!lines.length) {
    lines.push("Question text not provided.");
  }

  children.push(
    new Paragraph({
      spacing: {
        before: 220,
        after: 90,
      },
      children: [
        new TextRun({
          text: `${number}. `,
          bold: true,
        }),
        new TextRun({
          text: lines[0],
          bold: true,
        }),
      ],
    })
  );

  // Preserve additional question lines.
  lines.slice(1).forEach((line) => {
    children.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: line,
          }),
        ],
      })
    );
  });
}

async function addQuestionImage(children, question) {
  const imageUrl =
    typeof question?.imageUrl === "string"
      ? question.imageUrl.trim()
      : "";

  if (!imageUrl) return;

  const imageRun = await createImageRun(imageUrl);

  if (imageRun) {
    children.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { before: 80, after: 120 },
        children: [imageRun],
      })
    );
  } else {
    children.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: "[Question image could not be embedded]",
            color: "777777",
            italics: true,
            size: 18,
          }),
        ],
      })
    );
  }
}

function addOptions(
  children,
  question,
  answerMode,
  questionNumber
) {
  const options = Array.isArray(question?.options)
    ? question.options
    : [];

  options.forEach((option, index) => {
    const isCorrect =
      answerMode === "inline" &&
      sameText(option, question?.correctAnswer);

    children.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 65 },
        children: [
          new TextRun({
            text: `${optionLetter(index)}. `,
            bold: true,
          }),
          new TextRun({
            text: formatWordText(option),
            bold: isCorrect,
            color: isCorrect ? "15803D" : "222222",
          }),
          ...(isCorrect
            ? [
                new TextRun({
                  text: "  ✓",
                  bold: true,
                  color: "15803D",
                }),
              ]
            : []),
        ],
      })
    );
  });
}

function addInlineExplanation(children, question, answerMode, showExplanations) {
  if (
    answerMode !== "inline" ||
    !showExplanations ||
    !question?.explanation
  ) {
    return;
  }

  children.push(
    new Paragraph({
      indent: { left: 360 },
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: "Explanation: ",
          bold: true,
        }),
        new TextRun({
          text: formatWordText(question.explanation),
        }),
      ],
    })
  );
}

function addAnswerKey(children, questions, showExplanations) {
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: "Answer Key",
        }),
      ],
    })
  );

  questions.forEach((question, index) => {
    const options = Array.isArray(question?.options)
      ? question.options
      : [];

    const correctAnswer = question?.correctAnswer;

    const optionIndex = options.findIndex((option) =>
      sameText(option, correctAnswer)
    );

    let answer = "";

    if (optionIndex >= 0) {
      answer = optionLetter(optionIndex);
    } else if (normalizeAnswer(correctAnswer)) {
      answer = formatWordText(correctAnswer);
    } else {
      answer = "Not provided";
    }

    children.push(
      new Paragraph({
        spacing: { after: 75 },
        children: [
          new TextRun({
            text: `${index + 1}. `,
            bold: true,
          }),
          new TextRun({
            text: answer,
          }),
        ],
      })
    );
  });

  if (
    showExplanations &&
    questions.some((question) => Boolean(question?.explanation))
  ) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 120 },
        children: [
          new TextRun({
            text: "Explanations",
          }),
        ],
      })
    );

    questions.forEach((question, index) => {
      if (!question?.explanation) return;

      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${index + 1}. `,
              bold: true,
            }),
            new TextRun({
              text: formatWordText(question.explanation),
            }),
          ],
        })
      );
    });
  }
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1500);
}

export async function downloadQuizAsDocx({
  quiz,
  questions,
  answerMode = "none",
  showExplanations = false,
  studentLines = true,
}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("There are no questions to export.");
  }

  const title = toText(quiz?.title).trim() || "Quiz";
  const safeTitle =
    title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "Quiz";

  const children = [];

  // Document title.
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 36,
        }),
      ],
    })
  );

  // Quiz metadata.
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: getQuizMetadata(quiz, questions.length),
          color: "555555",
          size: 19,
        }),
      ],
    })
  );

  if (studentLines) {
    addStudentInformation(children);
  }

  // Questions.
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const number = index + 1;

    addQuestionText(children, question, number);

    await addQuestionImage(children, question);

    addOptions(
      children,
      question,
      answerMode,
      number
    );

    addInlineExplanation(
      children,
      question,
      answerMode,
      showExplanations
    );
  }

  // Separate answer key.
  if (answerMode === "key") {
    addAnswerKey(
      children,
      questions,
      showExplanations
    );
  }

  const documentFile = new Document({
    creator: "Noted AI",
    title,
    description: "Questions exported from Noted AI",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 900,
              bottom: 720,
              left: 900,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(documentFile);

  downloadBlob(blob, `${safeTitle}.docx`);
}