import { AudioLines, StarsIcon } from 'lucide-react'

export default function SiginFirstSection() {
    return (
        // Removed background and border. It is now 100% transparent.
        <div className="w-full md:w-1/2 flex flex-col justify-center gap-8 p-6 md:p-12">
            
            {/* Header / Logo Area */}
            <div className="flex items-center gap-3">
                <h2 className="m-0 flex items-center justify-center w-10 h-10 rounded-lg bg-brand text-brand-foreground shadow-sm">
                    <AudioLines className="w-5 h-5" />
                </h2>
                <div className="flex flex-col">
                    <h3 className="m-0 text-lg font-display font-bold text-foreground leading-none">Noted</h3>
                    <h4 className="m-0 text-sm text-muted-foreground mt-1">study.butlouder</h4>
                </div>
            </div>

            {/* Audio / Image Card */}
            <div className="rounded-2xl bg-card/80 backdrop-blur-sm text-card-foreground p-4 shadow-soft border border-border/50 flex flex-col gap-4">
                <h2 className="m-0 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <AudioLines className="w-4 h-4 text-brand" /> 4:12 of audio
                </h2>
                <div className="rounded-xl overflow-hidden bg-muted aspect-video">
                    <img 
                        src="../../../../../images/registerPics.png" 
                        alt="A child using this website to read" 
                        className="w-full h-full object-cover" 
                    />
                </div>
                <h2 className="m-0 flex items-center gap-2 text-sm font-bold text-flame font-display">
                    🔥 9-day streak
                </h2>
            </div>

            {/* Main Heading */}
            <h2 className="m-0 text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground leading-tight">
                Your messy notes, <br /> narrated back to you.
            </h2>
            
            {/* Subtext */}
            <p className="m-0 text-base text-muted-foreground leading-relaxed max-w-md">
                Paste a wall of lecture text and Noted turns it into a summary you can listen to, cartoon visuals you actually remember, and a focus session that keeps you going.
            </p>

            {/* Social Proof */}
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-brand">
                <StarsIcon className="w-4 h-4 fill-current" /> Loved by 40,000+ student
            </h3>
        </div>
    )
}