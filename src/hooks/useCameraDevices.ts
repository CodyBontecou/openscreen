import { useEffect, useState } from "react";

export interface CameraDevice {
	deviceId: string;
	label: string;
	groupId: string;
}

export function useCameraDevices(enabled: boolean = true) {
	const [devices, setDevices] = useState<CameraDevice[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let mounted = true;

		const loadDevices = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Request permission first to get actual device labels
				const stream = await navigator.mediaDevices.getUserMedia({ video: true });

				const allDevices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = allDevices
					.filter((device) => device.kind === "videoinput")
					.map((device) => ({
						deviceId: device.deviceId,
						label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
						groupId: device.groupId,
					}));

				// Stop the permission stream
				stream.getTracks().forEach((track) => track.stop());

				if (mounted) {
					setDevices(videoInputs);
					if (selectedDeviceId === "default" && videoInputs.length > 0) {
						setSelectedDeviceId(videoInputs[0].deviceId);
					}
					setIsLoading(false);
				}
			} catch (err) {
				if (mounted) {
					const errorMessage =
						err instanceof Error ? err.message : "Failed to enumerate video devices";
					setError(errorMessage);
					setIsLoading(false);
					console.error("Error loading camera devices:", err);
				}
			}
		};

		loadDevices();

		const handleDeviceChange = () => {
			loadDevices();
		};

		navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

		return () => {
			mounted = false;
			navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
		};
	}, [enabled, selectedDeviceId]);

	return {
		devices,
		selectedDeviceId,
		setSelectedDeviceId,
		isLoading,
		error,
	};
}
