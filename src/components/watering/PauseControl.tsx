import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  pauseUntil: Date | null;
  onPause: (untilISO: string | null) => void;
};

const PRESETS = [
  { label: "1 dag", days: 1 },
  { label: "3 dage", days: 3 },
  { label: "7 dage", days: 7 },
  { label: "14 dage (ferie)", days: 14 },
];

export default function PauseControl({ pauseUntil, onPause }: Props) {
  const active = !!pauseUntil && pauseUntil.getTime() > Date.now();
  if (active) {
    return (
      <Button variant="outline" onClick={() => onPause(null)} className="border-amber-300 text-amber-700">
        <Play size={16} className="mr-1.5" />
        Genoptag · pause til {pauseUntil!.toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
      </Button>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Pause size={16} className="mr-1.5" />
          Pause
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="text-xs text-muted-foreground px-2 py-1">Pause hele vandingen</div>
        <div className="grid gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              className="text-left px-2 py-1.5 rounded-md hover:bg-muted text-sm"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + p.days);
                d.setHours(0, 0, 0, 0);
                onPause(d.toISOString());
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
