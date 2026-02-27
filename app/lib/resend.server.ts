import { Resend } from "resend";
import envVars from "~/lib/envVars";

export default new Resend(envVars.RESEND_API_KEY);
