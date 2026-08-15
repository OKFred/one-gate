import { describe, expect, it } from "vitest";

import { isMissingS3ObjectError } from "./s3.js";

describe("S3 对象缺失异常识别", () => {
  it("对象不存在返回 true，但 Bucket 不存在必须继续抛出", () => {
    expect(isMissingS3ObjectError({ name: "NoSuchKey" })).toBe(true);
    expect(
      isMissingS3ObjectError({
        name: "S3ServiceException",
        $metadata: { httpStatusCode: 404 },
      })
    ).toBe(true);
    expect(
      isMissingS3ObjectError({
        name: "S3ServiceException",
        code: "NoSuchBucket",
        $metadata: { httpStatusCode: 404 },
      })
    ).toBe(false);
  });
});
