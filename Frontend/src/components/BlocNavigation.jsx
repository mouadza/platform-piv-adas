import React from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const BlocNavigation = ({
  blocs,
  currentBlocIndex,
  setCurrentBlocIndex,
  gammeValidee,
  onNext,
  onPrev,
  onFinish,
  compact = false,
}) => {
  const progress = ((currentBlocIndex + 1) / blocs.length) * 100;
  const currentBloc = blocs[currentBlocIndex];
  const isLastBloc = currentBlocIndex === blocs.length - 1;

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
      return;
    }

    setCurrentBlocIndex(currentBlocIndex - 1);
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
      return;
    }

    setCurrentBlocIndex(currentBlocIndex + 1);
  };

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${
        compact ? "" : "sticky top-0 z-10"
      }`}
    >
      <div className={`flex items-center gap-3 ${compact ? "p-2" : "p-3 sm:p-4"}`}>
        <button
          onClick={handlePrev}
          disabled={currentBlocIndex === 0}
          className={`flex flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-[#243782]/25 hover:text-[#243782] active:scale-95 disabled:opacity-30 ${
            compact ? "h-9 w-9" : "h-10 w-10 sm:h-12 sm:w-12"
          }`}
        >
          <ChevronLeft size={compact ? 18 : 20} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Bloc {currentBlocIndex + 1} / {blocs.length}
            </span>

            {gammeValidee && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={14} /> Validée
              </span>
            )}
          </div>

          <h2 className="truncate text-base font-extrabold text-slate-900">
            {currentBloc?.title || `Bloc ${currentBlocIndex + 1}`}
          </h2>

          <div className={`${compact ? "mt-1.5" : "mt-2.5"} h-1.5 w-full overflow-hidden rounded-full bg-slate-100`}>
            <div
              className="h-1.5 rounded-full bg-[#243782] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isLastBloc ? (
          <button
            onClick={onFinish}
            className={`flex flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 ${
              compact ? "h-9 px-4" : "h-12 px-5"
            }`}
          >
            Terminer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`flex flex-shrink-0 items-center justify-center rounded-lg bg-[#243782] text-white shadow-sm transition-all hover:bg-[#00133B] active:scale-95 ${
              compact ? "h-9 w-9" : "h-10 w-10 sm:h-12 sm:w-12"
            }`}
          >
            <ChevronRight size={compact ? 18 : 20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BlocNavigation;


