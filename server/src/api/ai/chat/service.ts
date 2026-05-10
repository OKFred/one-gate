import { Context } from "@/types/app";

const chat = async (c: Context) => {
  const { logger } = c.var;
  const params = c.req.query();
  const { q } = params;
  logger.info("gotcha");
  async function ask(prompt: string) {
    // TODO: 后续让用户自己配置模型地址
    const res = await fetch("/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-oss:20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        // max_tokens: 256,
      }),
    });
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices[0].message.content;
  }
  const data = await ask(q);
  return c.json({
    ok: true,
    data,
    message: "OK",
  });
};
