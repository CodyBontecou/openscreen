import { CheckCircle2, Download, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportProgress } from "@/lib/exporter";

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	progress: ExportProgress | null;
	isExporting: boolean;
	error: string | null;
	onCancel?: () => void;
	exportFormat?: "mp4" | "gif";
	exportedFilePath?: string;
	onShowInFolder?: () => void;
}

export function ExportDialog({
	isOpen,
	onClose,
	progress,
	isExporting,
	error,
	onCancel,
	exportFormat = "mp4",
	exportedFilePath,
	onShowInFolder,
}: ExportDialogProps) {
	const t = useScopedT("dialogs");
	const [showSuccess, setShowSuccess] = useState(false);

	// Reset showSuccess when a new export starts or dialog reopens
	useEffect(() => {
		if (isExporting) {
			setShowSuccess(false);
		}
	}, [isExporting]);

	// Reset showSuccess when dialog opens fresh
	useEffect(() => {
		if (isOpen && !isExporting && !progress) {
			setShowSuccess(false);
		}
	}, [isOpen, isExporting, progress]);

	useEffect(() => {
		if (!isExporting && progress && progress.percentage >= 100 && !error) {
			setShowSuccess(true);
			const timer = setTimeout(() => {
				setShowSuccess(false);
				onClose();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [isExporting, progress, error, onClose]);

	// These hooks MUST be before the early return to satisfy Rules of Hooks.
	const isFinalizing = progress?.phase === "finalizing";
	const finalizingPhase = progress?.finalizingPhase;
	const finalizingProgress = progress?.finalizingProgress;
	const finalizingElapsedSec = progress?.finalizingElapsedSec ?? 0;

	// Tick elapsed time locally so the counter updates every second even when
	// no new progress events arrive (e.g. during the real-time audio render).
	const [localElapsed, setLocalElapsed] = useState(0);
	const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	useEffect(() => {
		if (isFinalizing && isExporting) {
			if (!elapsedIntervalRef.current) {
				setLocalElapsed(finalizingElapsedSec);
				elapsedIntervalRef.current = setInterval(() => {
					setLocalElapsed((s) => s + 1);
				}, 1000);
			}
		} else {
			if (elapsedIntervalRef.current) {
				clearInterval(elapsedIntervalRef.current);
				elapsedIntervalRef.current = null;
			}
			setLocalElapsed(0);
		}
		return () => {
			if (elapsedIntervalRef.current) {
				clearInterval(elapsedIntervalRef.current);
				elapsedIntervalRef.current = null;
			}
		};
	}, [isFinalizing, isExporting, finalizingElapsedSec]);

	if (!isOpen) return null;

	const formatLabel = exportFormat === "gif" ? "GIF" : "Video";

	// Determine if we're in the compiling phase (frames done but still exporting)
	const isCompiling =
		isExporting && progress && progress.percentage >= 100 && exportFormat === "gif";
	const renderProgress = progress?.renderProgress;

	// Map finalizingPhase to a human-readable label
	const getFinalizingPhaseInfo = () => {
		switch (finalizingPhase) {
			case "flushing":
				return { label: "Flushing encoder" };
			case "processing-audio":
				return { label: "Encoding audio" };
			case "rendering-audio":
				return { label: "Rendering audio (real-time)" };
			case "writing":
				return { label: "Writing file" };
			default:
				return { label: "Finalizing..." };
		}
	};

	// Get status message based on phase
	const getStatusMessage = () => {
		if (error) return t("export.tryAgain");
		if (isCompiling || isFinalizing) {
			if (exportFormat === "mp4") {
				return t("export.finalizingVideo");
			}
			if (renderProgress !== undefined && renderProgress > 0) {
				return t("export.compilingGifProgress", { progress: String(renderProgress) });
			}
			return t("export.compilingGifWait");
		}
		return t("export.takeMoment");
	};

	// Get title based on phase
	const getTitle = () => {
		if (error) return t("export.failed");
		if (isFinalizing && exportFormat === "mp4") return t("export.finalizingVideoTitle");
		if (isCompiling || isFinalizing) return t("export.compilingGif");
		return t("export.exportingFormat", { format: formatLabel });
	};

	return (
		<>
			<div
				className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200"
				onClick={isExporting ? undefined : onClose}
			/>
			<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[90vw] max-w-md animate-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						{showSuccess ? (
							<>
								<div className="w-12 h-12 rounded-full bg-[#34B27B]/20 flex items-center justify-center ring-1 ring-[#34B27B]/50">
									<Download className="w-6 h-6 text-[#34B27B]" />
								</div>
								<div className="flex flex-col gap-2">
									<span className="text-xl font-bold text-slate-200 block">
										{t("export.complete")}
									</span>
									<span className="text-sm text-slate-400">
										{t("export.yourFormatReady", { format: formatLabel.toLowerCase() })}
									</span>
									{exportedFilePath && (
										<Button
											variant="secondary"
											onClick={onShowInFolder}
											className="mt-2 w-fit px-3 py-1 text-sm rounded-md bg-white/10 hover:bg-white/20 text-slate-200"
										>
											{t("export.showInFolder")}
										</Button>
									)}
									{exportedFilePath && (
										<span className="text-xs text-slate-500 break-all max-w-xs mt-1">
											{exportedFilePath.split("/").pop()}
										</span>
									)}
								</div>
							</>
						) : (
							<>
								{isExporting ? (
									<div className="w-12 h-12 rounded-full bg-[#34B27B]/10 flex items-center justify-center">
										<Loader2 className="w-6 h-6 text-[#34B27B] animate-spin" />
									</div>
								) : (
									<div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
										<Download className="w-6 h-6 text-slate-200" />
									</div>
								)}
								<div>
									<span className="text-xl font-bold text-slate-200 block">{getTitle()}</span>
									<span className="text-sm text-slate-400">{getStatusMessage()}</span>
								</div>
							</>
						)}
					</div>
					{!isExporting && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full"
						>
							<X className="w-5 h-5" />
						</Button>
					)}
				</div>

				{error && (
					<div className="mb-6 animate-in slide-in-from-top-2">
						<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
							<div className="p-1 bg-red-500/20 rounded-full">
								<X className="w-3 h-3 text-red-400" />
							</div>
							<p className="text-sm text-red-400 leading-relaxed">{error}</p>
						</div>
					</div>
				)}

				{isExporting && progress && (
					<div className="space-y-6">
						{/* ── Rendering-frames progress bar ── */}
						{!isFinalizing && (
							<div className="space-y-2">
								<div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
									<span>{isCompiling ? t("export.compiling") : t("export.renderingFrames")}</span>
									<span className="font-mono text-slate-200">
										{isCompiling ? (
											renderProgress !== undefined && renderProgress > 0 ? (
												`${renderProgress}%`
											) : (
												<span className="flex items-center gap-2">
													<Loader2 className="w-3 h-3 animate-spin" />
													{t("export.processing")}
												</span>
											)
										) : (
											`${progress.percentage.toFixed(0)}%`
										)}
									</span>
								</div>
								<div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
									{isCompiling ? (
										renderProgress !== undefined && renderProgress > 0 ? (
											<div
												className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
												style={{ width: `${renderProgress}%` }}
											/>
										) : (
											<IndeterminateBar />
										)
									) : (
										<div
											className="h-full bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
											style={{ width: `${Math.min(progress.percentage, 100)}%` }}
										/>
									)}
								</div>
							</div>
						)}

						{/* ── Finalizing steps (MP4 only) ── */}
						{isFinalizing && exportFormat === "mp4" && (
							<FinalizingSteps
								finalizingPhase={finalizingPhase}
								finalizingProgress={finalizingProgress}
								elapsedSec={localElapsed}
							/>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white/5 rounded-xl p-3 border border-white/5">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
									{isCompiling || isFinalizing ? t("export.status") : t("export.format")}
								</div>
								<div className="text-slate-200 font-medium text-sm">
									{isFinalizing && exportFormat === "mp4"
										? getFinalizingPhaseInfo().label
										: isCompiling || isFinalizing
											? t("export.compilingStatus")
											: formatLabel}
								</div>
							</div>
							<div className="bg-white/5 rounded-xl p-3 border border-white/5">
								<div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
									{isFinalizing ? "Elapsed" : t("export.frames")}
								</div>
								<div className="text-slate-200 font-medium text-sm font-mono">
									{isFinalizing
										? formatElapsed(localElapsed)
										: `${progress.currentFrame} / ${progress.totalFrames}`}
								</div>
							</div>
						</div>

						{onCancel && (
							<div className="pt-2">
								<Button
									onClick={onCancel}
									variant="destructive"
									className="w-full py-6 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all rounded-xl"
								>
									{t("export.cancelExport")}
								</Button>
							</div>
						)}
					</div>
				)}

				{showSuccess && (
					<div className="text-center py-4 animate-in zoom-in-95">
						<p className="text-lg text-slate-200 font-medium">
							{t("export.savedSuccessfully", { format: formatLabel })}
						</p>
					</div>
				)}
			</div>
		</>
	);
}

// ─── Helper: indeterminate shimmer bar ────────────────────────────────────────────────────────────────────────────────────

function IndeterminateBar() {
	return (
		<div className="h-full w-full relative overflow-hidden">
			<div
				className="absolute h-full w-1/3 bg-[#34B27B] shadow-[0_0_10px_rgba(52,178,123,0.3)]"
				style={{ animation: "indeterminate 1.5s ease-in-out infinite" }}
			/>
			<style>{`
				@keyframes indeterminate {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(400%); }
				}
			`}</style>
		</div>
	);
}

// ─── Helper: format elapsed seconds as m:ss ────────────────────────────────────────────────────────────────────────────
function formatElapsed(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Finalizing-steps panel ───────────────────────────────────────────────────────────────────────────────────────────
type FinalizingPhaseKey = "flushing" | "processing-audio" | "rendering-audio" | "writing";

const FINALIZE_STEPS: { key: FinalizingPhaseKey; label: string }[] = [
	{ key: "flushing", label: "Flush encoder" },
	{ key: "processing-audio", label: "Encode audio" },
	{ key: "rendering-audio", label: "Render audio" },
	{ key: "writing", label: "Write file" },
];

function FinalizingSteps({
	finalizingPhase,
	finalizingProgress,
	elapsedSec,
}: {
	finalizingPhase: FinalizingPhaseKey | undefined;
	finalizingProgress: number | undefined;
	elapsedSec: number;
}) {
	const phaseOrder: FinalizingPhaseKey[] = [
		"flushing",
		"processing-audio",
		"rendering-audio",
		"writing",
	];
	const currentIdx = finalizingPhase ? phaseOrder.indexOf(finalizingPhase) : -1;

	// Only show steps that are actually reachable given the current phase seen.
	// We skip audio steps that never appeared (e.g. no audio track).
	const visibleSteps = FINALIZE_STEPS.filter((step) => {
		const idx = phaseOrder.indexOf(step.key);
		// Always show completed/current. For future audio steps, only show if
		// we haven't passed them yet (they could still appear).
		return idx <= currentIdx + 1;
	});

	return (
		<div className="space-y-3">
			{/* Step list */}
			<div className="flex flex-col gap-1.5">
				{visibleSteps.map((step) => {
					const idx = phaseOrder.indexOf(step.key);
					const isDone = idx < currentIdx;
					const isActive = idx === currentIdx;
					return (
						<div key={step.key} className="flex items-center gap-2.5">
							<span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
								{isDone ? (
									<CheckCircle2 className="w-4 h-4 text-[#34B27B]" />
								) : isActive ? (
									<Loader2 className="w-4 h-4 text-[#34B27B] animate-spin" />
								) : (
									<span className="w-3 h-3 rounded-full border border-white/20" />
								)}
							</span>
							<span
								className={`text-sm ${
									isDone
										? "text-slate-500 line-through"
										: isActive
											? "text-slate-200 font-medium"
											: "text-slate-600"
								}`}
							>
								{step.label}
							</span>
							{isActive && finalizingProgress !== undefined && (
								<span className="ml-auto text-xs font-mono text-[#34B27B]">
									{Math.round(finalizingProgress)}%
								</span>
							)}
						</div>
					);
				})}
			</div>

			{/* Progress bar for the active step */}
			<div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
				{finalizingProgress !== undefined ? (
					<div
						className="h-full bg-[#34B27B] shadow-[0_0_8px_rgba(52,178,123,0.3)] transition-all duration-300 ease-out"
						style={{ width: `${Math.min(finalizingProgress, 100)}%` }}
					/>
				) : (
					<IndeterminateBar />
				)}
			</div>

			{/* Hint for long real-time audio rendering */}
			{finalizingPhase === "rendering-audio" && elapsedSec >= 3 && (
				<p className="text-xs text-slate-500 leading-relaxed">
					⚠️ Audio is being rendered in real-time to preserve pitch. This step takes as long as the
					video itself.
				</p>
			)}
		</div>
	);
}
