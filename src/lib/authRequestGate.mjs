// A generation also distinguishes sign-out/sign-in of the SAME account.
export function createAuthRequestGate() {
  let generation = 0;
  let identity = null;
  return {
    begin(userId) {
      identity = userId;
      return { userId, generation: ++generation };
    },
    invalidate() {
      identity = null;
      generation++;
    },
    isCurrent(ticket) {
      return ticket.generation === generation && ticket.userId === identity;
    },
  };
}
