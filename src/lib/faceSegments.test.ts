import { describe, expect, it } from "vitest";
import { applyFaceCut, buildVirtualFaceSegment, findSegmentAtRelMs } from "./faceSegments";

const idGen = () => {
	let i = 100;
	return () => `seg-${i++}`;
};

describe("applyFaceCut", () => {
	it("splits a single segment with a cut fully inside it", () => {
		const start = [{ id: "a", sourceStartMs: 0, sourceEndMs: 10000, screenStartMs: 0 }];
		const out = applyFaceCut(start, 3000, 7000, idGen());
		expect(out).toEqual([
			{ id: "a", sourceStartMs: 0, sourceEndMs: 3000, screenStartMs: 0 },
			{ id: "seg-100", sourceStartMs: 7000, sourceEndMs: 10000, screenStartMs: 3000 },
		]);
	});

	it("removes the entire segment when the cut covers it", () => {
		const start = [{ id: "a", sourceStartMs: 0, sourceEndMs: 4000, screenStartMs: 1000 }];
		const out = applyFaceCut(start, 0, 6000, idGen());
		expect(out).toEqual([]);
	});

	it("trims left edge when cut overlaps the start", () => {
		const start = [{ id: "a", sourceStartMs: 0, sourceEndMs: 5000, screenStartMs: 0 }];
		const out = applyFaceCut(start, 0, 2000, idGen());
		expect(out).toEqual([{ id: "a", sourceStartMs: 2000, sourceEndMs: 5000, screenStartMs: 0 }]);
	});

	it("trims right edge when cut overlaps the end", () => {
		const start = [{ id: "a", sourceStartMs: 0, sourceEndMs: 5000, screenStartMs: 0 }];
		const out = applyFaceCut(start, 3000, 5000, idGen());
		expect(out).toEqual([{ id: "a", sourceStartMs: 0, sourceEndMs: 3000, screenStartMs: 0 }]);
	});

	it("shifts later segments left by the cut length", () => {
		const start = [
			{ id: "a", sourceStartMs: 0, sourceEndMs: 2000, screenStartMs: 0 },
			{ id: "b", sourceStartMs: 4000, sourceEndMs: 6000, screenStartMs: 2000 },
			{ id: "c", sourceStartMs: 8000, sourceEndMs: 10000, screenStartMs: 4000 },
		];
		const out = applyFaceCut(start, 1000, 3000, idGen());
		expect(out).toEqual([
			{ id: "a", sourceStartMs: 0, sourceEndMs: 1000, screenStartMs: 0 },
			{ id: "b", sourceStartMs: 5000, sourceEndMs: 6000, screenStartMs: 1000 },
			{ id: "c", sourceStartMs: 8000, sourceEndMs: 10000, screenStartMs: 2000 },
		]);
	});

	it("is a no-op for a zero-length cut", () => {
		const start = [{ id: "a", sourceStartMs: 0, sourceEndMs: 5000, screenStartMs: 0 }];
		const out = applyFaceCut(start, 2000, 2000, idGen());
		expect(out).toEqual(start);
	});

	it("returns empty for empty input", () => {
		const out = applyFaceCut([], 0, 1000, idGen());
		expect(out).toEqual([]);
	});
});

describe("findSegmentAtRelMs", () => {
	const segs = [
		{ id: "a", sourceStartMs: 0, sourceEndMs: 1000, screenStartMs: 0 },
		{ id: "b", sourceStartMs: 5000, sourceEndMs: 6000, screenStartMs: 1000 },
	];

	it("returns the segment whose screen range contains t", () => {
		expect(findSegmentAtRelMs(segs, 500)?.id).toBe("a");
		expect(findSegmentAtRelMs(segs, 1500)?.id).toBe("b");
	});

	it("treats segment screen-end as exclusive", () => {
		expect(findSegmentAtRelMs(segs, 1000)?.id).toBe("b");
	});

	it("returns null when t is outside every segment", () => {
		expect(findSegmentAtRelMs(segs, -1)).toBeNull();
		expect(findSegmentAtRelMs(segs, 10000)).toBeNull();
	});
});

describe("buildVirtualFaceSegment", () => {
	it("represents the uncut face track", () => {
		expect(buildVirtualFaceSegment(8000)).toEqual({
			id: "face-virtual",
			sourceStartMs: 0,
			sourceEndMs: 8000,
			screenStartMs: 0,
		});
	});
});
