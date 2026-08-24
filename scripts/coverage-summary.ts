const file = Bun.file("coverage/coverage-summary.json")
if (!(await file.exists())) process.exit(0)

const data = await file.json()
const total = data.total
const metrics = ["statements", "branches", "functions", "lines"]
const rows = [
  "## coverage",
  "",
  "| metric | percent |",
  "| --- | --- |",
  ...metrics.map((k) => `| ${k} | ${total[k].pct}% |`),
]
console.log(rows.join("\n"))
