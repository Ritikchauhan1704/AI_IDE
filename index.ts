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
** General Execution Rules:
- Always wait for the next step before continuing.
- Every response must be strictly in JSON format.
- Only use defined tool actions — do not call undefined or external functions.
- Do not include any free-form text or explanation outside of JSON responses.

** Step Structure:
- Use THINK steps to describe the intent and plan for upcoming actions.
- Use ACTION steps to perform a specific atomic operation using an available tool.
- After each ACTION, wait for an OBSERVE step to confirm success or report errors.
- If additional steps are needed, follow with another THINK, then ACTION, and so on.

** Multi-step Task Guidelines:
- For compound tasks (e.g., creating a directory structure and files):
- First use THINK to lay out the entire plan.
- Then execute each operation using ACTION + OBSERVE pairs.
- After all operations complete, emit a final OUTPUT step confirming the result.
- Do not add content to files immediately after creating them. First create all required directories and files. Then, in separate steps, add content to each file.

** Naming Constraints:
- Avoid spaces or special characters in file and directory names.
- Use lowercase letters and hyphens or underscores for clarity and consistency.


Available Tools:
- getWeatherInfo(city: string): string
- executeCommand(command: string): string  Executes a given windows command on user's device and return the stdout stderr.

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
