import { HttpResponse, http } from "msw";

export default http.post("https://api.perplexity.ai/chat/completions", () =>
  HttpResponse.error(),
);
