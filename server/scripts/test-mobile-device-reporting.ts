const baseUrl = "http://127.0.0.1:8787/api/v1/admin/mobile/device";
const authUrl = "http://127.0.0.1:8787/api/v1/admin/system/auth/login";

/** 判断未知响应是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 调用 JSON API 并返回解析结果。 */
async function postJson(
  url: string,
  body: Record<string, unknown>,
  options: { bearer?: string; deviceToken?: string } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.bearer) headers.Authorization = `Bearer ${options.bearer}`;
  if (options.deviceToken) headers["X-Device-Token"] = options.deviceToken;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const parsed: unknown = await response.json();
  if (!isRecord(parsed)) throw new Error(`Invalid JSON response from ${url}`);
  return { status: response.status, body: parsed };
}

/** 从统一响应中取出 data。 */
function responseData(response: Record<string, unknown>): unknown {
  if (response.ok !== true) {
    const message =
      typeof response.message === "string" ? response.message : "unknown";
    throw new Error(`API returned ok=false (${message})`);
  }
  return response.data;
}

/** 断言测试条件。 */
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** 执行设备上报集成测试并清理临时设备。 */
async function main(): Promise<void> {
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!username || !password)
    throw new Error("Super admin test credentials are missing");

  const login = await postJson(authUrl, {
    username,
    password: Buffer.from(password, "utf8").toString("base64"),
  });
  const loginData = responseData(login.body);
  assert(isRecord(loginData) && isRecord(loginData.userObj), "Login failed");
  assert(typeof loginData.userObj.token === "string", "Login token missing");
  const bearer = loginData.userObj.token;
  const clientId = `codex-report-test-${crypto.randomUUID()}`;
  let deviceId: number | null = null;

  try {
    const added = await postJson(
      `${baseUrl}/add`,
      {
        clientId,
        deviceName: "Reporting integration test",
        isEnabled: true,
        remark: null,
      },
      { bearer }
    );
    const addedData = responseData(added.body);
    assert(typeof addedData === "number", "Device add did not return id");
    deviceId = addedData;

    const reset = await postJson(
      `${baseUrl}/report-token/reset`,
      { id: deviceId },
      { bearer }
    );
    const resetData = responseData(reset.body);
    assert(
      isRecord(resetData) && typeof resetData.token === "string",
      "Token reset failed"
    );
    let deviceToken = resetData.token;

    const presence = {
      protocolVersion: 2,
      deviceId: clientId,
      status: "ONLINE",
      timestamp: Date.now(),
    };
    const wrongToken = await postJson(`${baseUrl}/report/presence`, presence, {
      deviceToken: "wrong-token",
    });
    assert(wrongToken.body.ok === false, "Wrong token was accepted");

    const resetAgain = await postJson(
      `${baseUrl}/report-token/reset`,
      { id: deviceId },
      { bearer }
    );
    const resetAgainData = responseData(resetAgain.body);
    assert(
      isRecord(resetAgainData) && typeof resetAgainData.token === "string",
      "Second token reset failed"
    );
    const expiredToken = await postJson(
      `${baseUrl}/report/presence`,
      presence,
      {
        deviceToken,
      }
    );
    assert(expiredToken.body.ok === false, "Reset device token remained valid");
    deviceToken = resetAgainData.token;

    responseData(
      (
        await postJson(`${baseUrl}/report/presence`, presence, {
          deviceToken,
        })
      ).body
    );

    const dummyImei = "490154203237518";
    const dummySerial = "CODEX-SERIAL-TEST-001";
    responseData(
      (
        await postJson(
          `${baseUrl}/report/info`,
          {
            protocolVersion: 2,
            deviceId: clientId,
            timestamp: Date.now(),
            manufacturer: "Codex",
            brand: "Integration",
            model: "Virtual",
            androidVersion: "16",
            androidSdk: 36,
            autojs6Version: "test",
            clientVersion: "test",
            identifiers: {
              imeis: [dummyImei, dummyImei],
              imeiStatus: "available",
              serialNumber: dummySerial,
              serialStatus: "available",
            },
            capabilities: { root: true, trustedScripts: [] },
            reportedExtra: { testFlag: true },
          },
          { deviceToken }
        )
      ).body
    );

    const eventId = crypto.randomUUID();
    const event = {
      protocolVersion: 2,
      eventId,
      deviceId: clientId,
      type: "sms",
      timestamp: Date.now(),
      data: { address: "+8613800138000", body: "encrypted integration test" },
    };
    const firstEvent = responseData(
      (await postJson(`${baseUrl}/report/event`, event, { deviceToken })).body
    );
    const duplicateEvent = responseData(
      (await postJson(`${baseUrl}/report/event`, event, { deviceToken })).body
    );
    assert(
      isRecord(firstEvent) &&
        firstEvent.duplicate === false &&
        isRecord(duplicateEvent) &&
        duplicateEvent.duplicate === true,
      "Event idempotency failed"
    );

    responseData(
      (
        await postJson(
          `${baseUrl}/metadata/update`,
          {
            id: deviceId,
            customMetadata: {
              assetCode: { value: "ASSET-001", sensitive: false },
              ownerNote: { value: "sensitive-owner", sensitive: true },
            },
          },
          { bearer }
        )
      ).body
    );

    const detail = responseData(
      (await postJson(`${baseUrl}/get`, { id: deviceId }, { bearer })).body
    );
    const detailText = JSON.stringify(detail);
    assert(!detailText.includes(dummyImei), "List/detail leaked raw IMEI");
    assert(!detailText.includes(dummySerial), "List/detail leaked raw serial");
    assert(
      !detailText.includes("sensitive-owner"),
      "Detail leaked custom sensitive value"
    );

    const identifiers = responseData(
      (
        await postJson(
          `${baseUrl}/sensitive/reveal`,
          { id: deviceId, target: "identifiers" },
          { bearer }
        )
      ).body
    );
    assert(
      JSON.stringify(identifiers).includes(dummyImei),
      "Identifier reveal failed"
    );
    assert(
      isRecord(identifiers) &&
        Array.isArray(identifiers.imeis) &&
        identifiers.imeis.length === 1,
      "Duplicate multi-SIM identifier was not removed"
    );

    const eventList = responseData(
      (
        await postJson(
          `${baseUrl}/event/list`,
          { deviceId, pageNo: 1, pageSize: 20, eventType: "sms" },
          { bearer }
        )
      ).body
    );
    assert(
      isRecord(eventList) && Array.isArray(eventList.list),
      "Event list failed"
    );
    const savedEvent = eventList.list.find(
      (item) => isRecord(item) && item.eventId === eventId
    );
    assert(
      isRecord(savedEvent) && typeof savedEvent.id === "number",
      "Event not persisted"
    );
    const eventReveal = responseData(
      (
        await postJson(
          `${baseUrl}/sensitive/reveal`,
          { id: savedEvent.id, target: "event" },
          { bearer }
        )
      ).body
    );
    assert(
      JSON.stringify(eventReveal).includes("encrypted integration test"),
      "Event reveal failed"
    );

    const unknown = await postJson(
      `${baseUrl}/report/presence`,
      { ...presence, deviceId: `unknown-${crypto.randomUUID()}` },
      { deviceToken }
    );
    assert(unknown.body.ok === false, "Unknown device was accepted");

    responseData(
      (
        await postJson(
          `${baseUrl}/update`,
          {
            id: deviceId,
            clientId,
            deviceName: "Reporting integration test",
            isEnabled: false,
            remark: null,
          },
          { bearer }
        )
      ).body
    );
    const disabled = await postJson(`${baseUrl}/report/presence`, presence, {
      deviceToken,
    });
    assert(disabled.body.ok === false, "Disabled device was accepted");

    console.log("mobile device reporting integration: PASS");
  } finally {
    if (deviceId !== null) {
      await postJson(`${baseUrl}/delete`, { id: deviceId }, { bearer }).catch(
        () => undefined
      );
    }
  }
}

await main();
