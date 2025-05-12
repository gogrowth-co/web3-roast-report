
// Define webhook related types
export interface WebhookLog {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  payload: any;
  response: any;
  status: number | null;
}
