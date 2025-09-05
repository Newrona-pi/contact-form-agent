export function render(body: string, variables: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}
