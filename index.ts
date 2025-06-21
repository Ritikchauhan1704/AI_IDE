import { GoogleGenAI } from "@google/genai";
import { exec, execSync } from "child_process";

interface Message {
  role: "assistant" | "user";
  parts: Array<{
    text: string;
  }>;
}
interface ToolFunction {
  (...args: unknown[]): unknown;
}
interface ToolMap {
  [key: string]: ToolFunction;
}
interface Step {
  step: "THINK" | "OUTPUT" | "ACTION" | "OBSERVE";
  content: string;
  tool?: string;
  input?: string;
}

const model = "gemini-2.0-flash";
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
});
const config = {
  responseMimeType: "application/json",
};

function getWeatherInfo(cityName: string): string {
  return `The weather of ${cityName} is 32 Degree celsius.`;
}

function executeCommand(command: string) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(`stdout:${stdout}\nstderr:${stderr}`);
    });
  });
}
const SYSTEM_PROMPT = `You are a helpful ai assistant who is designed to resolve user query. 
You work on START, THINK, ACTION, OBSERVE and OUTPUT Mode.

In the start phase you will be given a user query.
Then, you THINK how to resolve the user query atleast 3-4 times and make sure that all is clear.
If there is a need to call a tool, you call an ACTION event with tool and input parameters.
If there is an action call, wait for the OBSERVE that is output of the tool.
Based on the OBSERVE, you can again call an action or you can go to the OUTPUT phase.
Rules:
- Always wait for the next step.
- Always output exactly one JSON step object and then wait for the next step.
- Output must be strictly JSON.
- Only call tool actions from the available tools.
- Strictly follow the output format in JSON.
- Don't emit an "OUTPUT" step until after you have called all of the tools needed to fully satisfy the request.
- For multi-step tasks (e.g., creating a directory and multiple files):
    - Directory name should not contain any special characters or spaces.
    - File name should not contain any special characters or spaces.
    - All the Directory and file should be created first and then there contents.
    - All the contents of the files should be created separately
    - Use a THINK step to describe each upcoming ACTION.
    - Use an ACTION step to invoke the tool for each atomic operation.
    - After each ACTION, wait for OBSERVE, then use another THINK if more steps remain.
    - Only when all required operations have completed successfully should you emit the final OUTPUT.


Available Tools:
- getWeatherInfo(city: string): string
- executeCommand(command: string): string  Executes a given windows command on user's device ad return the stdout stderr.

Example:
START: What is weather of Patiala?
THINK: The user is asking for the weather of patiala.
THINK: From the available tools, I must call getWeatherInfo tool for patiala as it is a weather related query.
ACTION: getWeatherInfo("Patiala")
OBSERVE: 32 Degree celsius
OBSERVE: The output of getWeatherInfo tool is 32 Degree celsius.
OUTPUT: The weather of Patiala is 32 Degree celsius which is quite hot.


Output example:
{"role":"user", "content":"what is weather of Patiala?"}
{"step":"THINK", "content":"The user is asking for the weather of patiala."}
{"step":"THINK", "content":"From the available tools, I must call getWeatherInfo tool for patiala as it is a weather related query."}
{"step":"ACTION", "tool":"getWeatherInfo", "input":"Patiala"}
{"step":"OBSERVE", "content":"32 Degree celsius"}
{"step":"THINK", "content":"The output of getWeatherInfo tool is 32 Degree celsius."}
{"step":"OUTPUT", "content":"The weather of Patiala is 32 Degree celsius which is quite hot."}

Output Format:
{"step":"string","tool":"string","input":"string","content":"string"}
`;

const messages: Message[] = [
  {
    role: "assistant",
    parts: [
      {
        text: SYSTEM_PROMPT,
      },
    ],
  },
];

const USER_PROMPT =
  "create a folder todo app and create a todo app with HTML CSS and JS fully working";

messages.push({
  role: "user",
  parts: [
    {
      text: USER_PROMPT,
    },
  ],
});

const TOOLS_MAP: ToolMap = {
  getWeatherInfo: getWeatherInfo as ToolFunction,
  executeCommand: executeCommand as ToolFunction,
};

while (true) {
  const res = await ai.models.generateContent({
    model,
    config,
    contents: messages,
  });
  const text = res.text;
  if (!text) {
    console.error("No response text received from AI");
    break;
  }
  messages.push({
    role: "assistant",
    parts: [
      {
        text,
      },
    ],
  });
  const parsed: Step = JSON.parse(text);

  if (parsed.step === "THINK") {
    console.log(`THINK: ${parsed.content}`);
    continue;
  }
  if (parsed.step === "OUTPUT") {
    console.log(`OUTPUT: ${parsed.content}`);
    break;
  }
  if (parsed.step === "ACTION") {
    const tool = parsed.tool;
    const input = parsed.input!;

    console.log(`ACTION: ${tool}(${input})`);

    if (!tool || !TOOLS_MAP[tool]) {
      console.error(`Unknown tool: ${tool}`);
      break;
    }

    const result = await TOOLS_MAP[tool](input);
    messages.push({
      role: "assistant",
      parts: [
        {
          text: JSON.stringify({
            step: "OBSERVE",
            content: result,
          }),
        },
      ],
    });
    continue;
  }
}
