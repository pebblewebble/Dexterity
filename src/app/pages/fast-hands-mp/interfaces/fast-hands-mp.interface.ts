export interface JoinGameResponse {
  success: boolean,
  error: string,
  position: "left" | "right",
  players: any[]
}
