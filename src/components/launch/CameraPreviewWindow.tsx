import { useEffect, useRef, useState } from "react";

export function CameraPreviewWindow() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [deviceId, setDeviceId] = useState<string | undefined>(() => {
		const params = new URLSearchParams(window.location.search);
		return params.get("deviceId") || undefined;
	});

	useEffect(() => {
		if (!window.electronAPI?.onCameraDeviceChanged) return;
		return window.electronAPI.onCameraDeviceChanged((id) => {
			setDeviceId(id);
		});
	}, []);

	useEffect(() => {
		let stream: MediaStream | null = null;
		let cancelled = false;

		async function start() {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: deviceId
						? { deviceId: { exact: deviceId }, width: 640, height: 640 }
						: { width: 640, height: 640 },
				});
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (err) {
				console.error("Camera preview failed:", err);
			}
		}

		start();

		return () => {
			cancelled = true;
			stream?.getTracks().forEach((t) => t.stop());
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
		};
	}, [deviceId]);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				borderRadius: "50%",
				overflow: "hidden",
				cursor: "move",
				// @ts-expect-error Electron CSS property
				WebkitAppRegion: "drag",
				boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.12)",
			}}
		>
			<video
				ref={videoRef}
				autoPlay
				muted
				playsInline
				style={{
					width: "100%",
					height: "100%",
					objectFit: "cover",
					display: "block",
					transform: "scaleX(-1)",
				}}
			/>
		</div>
	);
}
