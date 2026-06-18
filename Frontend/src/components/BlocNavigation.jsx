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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 sticky z-10">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={handlePrev}
          disabled={currentBlocIndex === 0}
          className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-800 disabled:opacity-30 hover:bg-slate-200 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
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

          <h2 className="text-base font-bold text-slate-800 truncate">
            {currentBloc?.title || `Bloc ${currentBlocIndex + 1}`}
          </h2>

          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sky-500 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isLastBloc ? (
          <button
            onClick={onFinish}
            className="flex-shrink-0 h-12 px-5 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-200 text-sm font-bold"
          >
            Terminer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 active:scale-95 transition-all shadow-sm shadow-sky-200"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BlocNavigation;