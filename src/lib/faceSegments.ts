import type { FaceSegment } from "@/components/video-editor/types";

const MIN_SEGMENT_MS = 1;

export function segmentDurationMs(seg: FaceSegment): number {
	return seg.sourceEndMs - seg.sourceStartMs;
}

export function segmentScreenEndMs(seg: FaceSegment): number {
	return seg.screenStartMs + segmentDurationMs(seg);
}

/**
 * Build the implicit single segment that represents an uncut face video.
 */
export function buildVirtualFaceSegment(durationMs: number): FaceSegment {
	return {
		id: "face-virtual",
		sourceStartMs: 0,
		sourceEndMs: Math.max(0, durationMs),
		screenStartMs: 0,
	};
}

/**
 * Find the segment that contains the given face-track-relative time.
 * Returns null if no segment covers it.
 */
export function findSegmentAtRelMs(
	segments: ReadonlyArray<FaceSegment>,
	tRelMs: number,
): FaceSegment | null {
	for (const seg of segments) {
		if (tRelMs >= seg.screenStartMs && tRelMs < segmentScreenEndMs(seg)) {
			return seg;
		}
	}
	return null;
}

/**
 * Apply a cut [aRelMs, bRelMs) to the segment list. Times are face-track-relative
 * (i.e. screen-time minus the global webcam offset). Anything inside the cut is
 * removed; anything after the cut shifts left by (b - a) so the remaining face
 * is stitched together. Returns a new sorted, gap-free list.
 *
 * `nextId` is invoked when a segment is split into two halves and we need a
 * fresh id for the right half.
 */
export function applyFaceCut(
	segments: ReadonlyArray<FaceSegment>,
	aRelMs: number,
	bRelMs: number,
	nextId: () => string,
): FaceSegment[] {
	const a = Math.min(aRelMs, bRelMs);
	const b = Math.max(aRelMs, bRelMs);
	const cutLen = b - a;
	if (cutLen < MIN_SEGMENT_MS) return [...segments];

	const next: FaceSegment[] = [];
	const sorted = [...segments].sort((x, y) => x.screenStartMs - y.screenStartMs);

	for (const seg of sorted) {
		const segScreenEnd = segmentScreenEndMs(seg);
		if (segScreenEnd <= a) {
			// Fully before the cut — keep as-is.
			next.push(seg);
			continue;
		}
		if (seg.screenStartMs >= b) {
			// Fully after the cut — shift left by cutLen.
			next.push({ ...seg, screenStartMs: seg.screenStartMs - cutLen });
			continue;
		}
		// Overlaps the cut. Possibly produce a left half and a right half.
		if (seg.screenStartMs < a) {
			const leftDuration = a - seg.screenStartMs;
			if (leftDuration >= MIN_SEGMENT_MS) {
				next.push({
					id: seg.id,
					sourceStartMs: seg.sourceStartMs,
					sourceEndMs: seg.sourceStartMs + leftDuration,
					screenStartMs: seg.screenStartMs,
				});
			}
		}
		if (segScreenEnd > b) {
			const rightStartScreenOld = Math.max(b, seg.screenStartMs);
			const sourceOffsetIntoSeg = rightStartScreenOld - seg.screenStartMs;
			const rightDuration = segScreenEnd - rightStartScreenOld;
			if (rightDuration >= MIN_SEGMENT_MS) {
				const rightId = seg.screenStartMs < a ? nextId() : seg.id;
				next.push({
					id: rightId,
					sourceStartMs: seg.sourceStartMs + sourceOffsetIntoSeg,
					sourceEndMs: seg.sourceEndMs,
					screenStartMs: rightStartScreenOld - cutLen,
				});
			}
		}
	}

	return next;
}
