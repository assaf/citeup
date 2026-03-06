import { HttpResponse, http } from "msw";

export default http.post("https://api.openai.com/v1/responses", () =>
  HttpResponse.error(),
);
