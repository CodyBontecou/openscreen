import { Check, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { FaFolderOpen } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import {
	MdMic,
	MdMicOff,
	MdMonitor,
	MdRestartAlt,
	MdVideocam,
	MdVideocamOff,
	MdVideoFile,
	MdVolumeOff,
	MdVolumeUp,
} from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import { isMac as getIsMac } from "@/utils/platformUtils";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";

const ICON_SIZE = 20;

const ICON_CONFIG = {
	drag: { icon: RxDragHandleDots2, size: ICON_SIZE },
	monitor: { icon: MdMonitor, size: ICON_SIZE },
	volumeOn: { icon: MdVolumeUp, size: ICON_SIZE },
	volumeOff: { icon: MdVolumeOff, size: ICON_SIZE },
	micOn: { icon: MdMic, size: ICON_SIZE },
	micOff: { icon: MdMicOff, size: ICON_SIZE },
	webcamOn: { icon: MdVideocam, size: ICON_SIZE },
	webcamOff: { icon: MdVideocamOff, size: ICON_SIZE },
	stop: { icon: FaRegStopCircle, size: ICON_SIZE },
	restart: { icon: MdRestartAlt, size: ICON_SIZE },
	record: { icon: BsRecordCircle, size: ICON_SIZE },
	videoFile: { icon: MdVideoFile, size: ICON_SIZE },
	folder: { icon: FaFolderOpen, size: ICON_SIZE },
	minimize: { icon: FiMinus, size: ICON_SIZE },
	close: { icon: FiX, size: ICON_SIZE },
} as const;

type IconName = keyof typeof ICON_CONFIG;

function getIcon(name: IconName, className?: string) {
	const { icon: Icon, size } = ICON_CONFIG[name];
	return <Icon size={size} className={className} />;
}

const hudGroupClasses =
	"flex items-center gap-0.5 bg-white/5 rounded-full transition-colors duration-150 hover:bg-white/[0.08]";

const hudIconBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer text-white hover:bg-white/10 hover:scale-[1.08] active:scale-95";

const windowBtnClasses =
	"flex items-center justify-center p-2 rounded-full transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08]";

type OpenDropdown = "mic" | "webcam" | null;

export function LaunchWindow() {
	const t = useScopedT("launch");
	const { locale, setLocale } = useI18n();
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		getIsMac().then(setIsMac);
	}, []);

	const {
		recording,
		toggleRecording,
		restartRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamDeviceId,
		setWebcamDeviceId,
	} = useScreenRecorder();
	const [recordingStart, setRecordingStart] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
	const dropdownContainerRef = useRef<HTMLDivElement>(null);

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicDeviceId,
		setSelectedDeviceId: setSelectedMicDeviceId,
	} = useMicrophoneDevices(microphoneEnabled);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraDeviceId,
		setSelectedDeviceId: setSelectedCameraDeviceId,
	} = useCameraDevices(webcamEnabled);
	const { level } = useAudioLevelMeter({
		enabled: microphoneEnabled && !recording,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedMicDeviceId && selectedMicDeviceId !== "default") {
			setMicrophoneDeviceId(selectedMicDeviceId);
		}
	}, [selectedMicDeviceId, setMicrophoneDeviceId]);

	useEffect(() => {
		if (selectedCameraDeviceId && selectedCameraDeviceId !== "default") {
			setWebcamDeviceId(selectedCameraDeviceId);
		}
	}, [selectedCameraDeviceId, setWebcamDeviceId]);

	// Camera preview: show when webcam enabled and not recording, hide otherwise
	useEffect(() => {
		if (!window.electronAPI) return;
		if (webcamEnabled && !recording) {
			void window.electronAPI.showCameraPreview(webcamDeviceId);
		} else {
			void window.electronAPI.hideCameraPreview();
		}
	}, [webcamEnabled, webcamDeviceId, recording]);

	// Close preview when HUD closes
	useEffect(() => {
		return () => {
			void window.electronAPI?.closeCameraPreview();
		};
	}, []);

	// Close dropdown on outside click
	useEffect(() => {
		if (!openDropdown) return;
		const handleClick = (e: MouseEvent) => {
			if (
				dropdownContainerRef.current &&
				!dropdownContainerRef.current.contains(e.target as Node)
			) {
				setOpenDropdown(null);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [openDropdown]);

	useEffect(() => {
		let timer: NodeJS.Timeout | null = null;
		if (recording) {
			if (!recordingStart) setRecordingStart(Date.now());
			timer = setInterval(() => {
				if (recordingStart) {
					setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
				}
			}, 1000);
		} else {
			setRecordingStart(null);
			setElapsed(0);
			if (timer) clearInterval(timer);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [recording, recordingStart]);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	const [selectedSource, setSelectedSource] = useState("Screen");
	const [hasSelectedSource, setHasSelectedSource] = useState(false);

	useEffect(() => {
		const checkSelectedSource = async () => {
			if (window.electronAPI) {
				const source = await window.electronAPI.getSelectedSource();
				if (source) {
					setSelectedSource(source.name);
					setHasSelectedSource(true);
				} else {
					setSelectedSource("Screen");
					setHasSelectedSource(false);
				}
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, []);

	const openSourceSelector = () => {
		if (window.electronAPI) {
			window.electronAPI.openSourceSelector();
		}
	};

	const openVideoFile = async () => {
		const result = await window.electronAPI.openVideoFilePicker();

		if (result.canceled) {
			return;
		}

		if (result.success && result.path) {
			await window.electronAPI.setCurrentVideoPath(result.path);
			await window.electronAPI.switchToEditor();
		}
	};

	const openProjectFile = async () => {
		const result = await window.electronAPI.loadProjectFile();
		if (result.canceled || !result.success) return;
		await window.electronAPI.switchToEditor();
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};

	const toggleMicrophone = () => {
		if (recording) return;
		if (!microphoneEnabled) {
			setMicrophoneEnabled(true);
		} else {
			setOpenDropdown(openDropdown === "mic" ? null : "mic");
		}
	};

	const toggleWebcamDropdown = () => {
		if (recording) return;
		setOpenDropdown(openDropdown === "webcam" ? null : "webcam");
	};

	return (
		<div className="w-full h-full flex items-end justify-center bg-transparent relative">
			{/* Language switcher — top-left, beside traffic lights */}
			<div
				className={`absolute top-2 flex items-center gap-1 px-2 py-1 rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-all duration-150 ${isMac ? "left-[72px]" : "left-2"} ${styles.electronNoDrag}`}
			>
				<Languages size={14} />
				<select
					value={locale}
					onChange={(e) => setLocale(e.target.value as Locale)}
					className="bg-transparent text-[11px] font-medium outline-none cursor-pointer appearance-none pr-1"
					style={{ color: "inherit" }}
				>
					{SUPPORTED_LOCALES.map((loc) => (
						<option key={loc} value={loc} className="bg-[#1c1c24] text-white">
							{getLocaleName(loc)}
						</option>
					))}
				</select>
			</div>

			<div className={`flex flex-col items-center gap-2 mx-auto ${styles.electronDrag}`}>
				{/* Main pill bar */}
				<div className="flex items-center gap-1.5 px-2 py-1.5 isolate rounded-full shadow-hud-bar bg-gradient-to-br from-[rgba(28,28,36,0.97)] to-[rgba(18,18,26,0.96)] backdrop-blur-[16px] backdrop-saturate-[140%] border border-[rgba(80,80,120,0.25)]">
					{/* Drag handle */}
					<div className={`flex items-center px-1 ${styles.electronDrag}`}>
						{getIcon("drag", "text-white/30")}
					</div>

					{/* Source selector */}
					<button
						className={`${hudGroupClasses} p-2 ${styles.electronNoDrag}`}
						onClick={openSourceSelector}
						disabled={recording}
						title={selectedSource}
					>
						{getIcon("monitor", "text-white/80")}
						<span className="text-white/70 text-[11px] max-w-[72px] truncate">
							{selectedSource}
						</span>
					</button>

					{/* Audio controls group */}
					<div
						ref={dropdownContainerRef}
						className={`${hudGroupClasses} ${styles.electronNoDrag} relative`}
					>
						<button
							className={`${hudIconBtnClasses} ${systemAudioEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
							onClick={() => !recording && setSystemAudioEnabled(!systemAudioEnabled)}
							disabled={recording}
							title={
								systemAudioEnabled ? t("audio.disableSystemAudio") : t("audio.enableSystemAudio")
							}
						>
							{systemAudioEnabled
								? getIcon("volumeOn", "text-green-400")
								: getIcon("volumeOff", "text-white/40")}
						</button>

						{/* Mic button + dropdown */}
						<div className="relative">
							<button
								className={`${hudIconBtnClasses} ${microphoneEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
								onClick={toggleMicrophone}
								disabled={recording}
								title={
									microphoneEnabled ? t("audio.disableMicrophone") : t("audio.enableMicrophone")
								}
							>
								{microphoneEnabled
									? getIcon("micOn", "text-green-400")
									: getIcon("micOff", "text-white/40")}
							</button>
							{openDropdown === "mic" && (
								<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e1e28] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[230px] z-50">
									{micDevices.map((device) => {
										const isSelected =
											(microphoneDeviceId || selectedMicDeviceId) === device.deviceId;
										return (
											<button
												key={device.deviceId}
												className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
												onClick={() => {
													setSelectedMicDeviceId(device.deviceId);
													setMicrophoneDeviceId(device.deviceId);
													setOpenDropdown(null);
												}}
											>
												<span className="w-4 flex-shrink-0">
													{isSelected && <Check size={14} className="text-white" />}
												</span>
												<span className="truncate">{device.label}</span>
											</button>
										);
									})}
									{microphoneEnabled && (
										<>
											<div className="my-1 border-t border-white/10" />
											<div className="px-3 py-1.5">
												<AudioLevelMeter level={level} className="w-full h-3" />
											</div>
										</>
									)}
									<div className="my-1 border-t border-white/10" />
									<button
										className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
										onClick={() => {
											setMicrophoneEnabled(false);
											setOpenDropdown(null);
										}}
									>
										<span className="w-4 flex-shrink-0" />
										<span>Don't record microphone</span>
									</button>
								</div>
							)}
						</div>

						{/* Webcam button + dropdown */}
						<div className="relative">
							<button
								className={`${hudIconBtnClasses} ${webcamEnabled ? "drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]" : ""}`}
								onClick={async () => {
									if (!webcamEnabled) {
										await setWebcamEnabled(true);
									} else {
										toggleWebcamDropdown();
									}
								}}
								title={webcamEnabled ? t("webcam.disableWebcam") : t("webcam.enableWebcam")}
							>
								{webcamEnabled
									? getIcon("webcamOn", "text-green-400")
									: getIcon("webcamOff", "text-white/40")}
							</button>
							{openDropdown === "webcam" && (
								<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1e1e28] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[230px] z-50">
									{cameraDevices.map((device) => {
										const isSelected =
											(webcamDeviceId || selectedCameraDeviceId) === device.deviceId;
										return (
											<button
												key={device.deviceId}
												className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
												onClick={() => {
													setSelectedCameraDeviceId(device.deviceId);
													setWebcamDeviceId(device.deviceId);
													setOpenDropdown(null);
												}}
											>
												<span className="w-4 flex-shrink-0">
													{isSelected && <Check size={14} className="text-white" />}
												</span>
												<span className="truncate">{device.label}</span>
											</button>
										);
									})}
									<div className="my-1 border-t border-white/10" />
									<button
										className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 transition-colors"
										onClick={async () => {
											await setWebcamEnabled(false);
											setOpenDropdown(null);
										}}
									>
										<span className="w-4 flex-shrink-0" />
										<span>Don't record camera</span>
									</button>
								</div>
							)}
						</div>
					</div>

					{/* Record/Stop group */}
					<button
						className={`flex items-center gap-0.5 rounded-full p-2 transition-colors duration-150 ${styles.electronNoDrag} ${
							recording ? "bg-red-500/10" : "bg-white/5 hover:bg-white/[0.08]"
						}`}
						onClick={hasSelectedSource ? toggleRecording : openSourceSelector}
						disabled={!hasSelectedSource && !recording}
						style={{ flex: "0 0 auto" }}
					>
						{recording ? (
							<>
								{getIcon("stop", "text-red-400")}
								<span className="text-red-400 text-xs font-semibold tabular-nums">
									{formatTimePadded(elapsed)}
								</span>
							</>
						) : (
							getIcon("record", hasSelectedSource ? "text-white/80" : "text-white/30")
						)}
					</button>

					{/* Restart recording */}
					{recording && (
						<Tooltip content={t("tooltips.restartRecording")}>
							<button
								className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
								onClick={restartRecording}
							>
								{getIcon("restart", "text-white/60")}
							</button>
						</Tooltip>
					)}

					{/* Open video file */}
					<Tooltip content={t("tooltips.openVideoFile")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={openVideoFile}
							disabled={recording}
						>
							{getIcon("videoFile", "text-white/60")}
						</button>
					</Tooltip>

					{/* Open project */}
					<Tooltip content={t("tooltips.openProject")}>
						<button
							className={`${hudIconBtnClasses} ${styles.electronNoDrag}`}
							onClick={openProjectFile}
							disabled={recording}
						>
							{getIcon("folder", "text-white/60")}
						</button>
					</Tooltip>

					{/* Window controls */}
					<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
						<button
							className={windowBtnClasses}
							title={t("tooltips.hideHUD")}
							onClick={sendHudOverlayHide}
						>
							{getIcon("minimize", "text-white")}
						</button>
						<button
							className={windowBtnClasses}
							title={t("tooltips.closeApp")}
							onClick={sendHudOverlayClose}
						>
							{getIcon("close", "text-white")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
