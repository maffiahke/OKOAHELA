$tok = (Get-Content ck.txt | Where-Object { $_ -match 'localhost' } | ForEach-Object { $p = -split $_; "$($p[5])=$($p[6])" }) -join ';'
$tok | Out-File -Encoding ascii cookie.txt
agent-browser set cookies-string $tok
agent-browser open http://localhost:3001/savings
agent-browser wait --load networkidle
agent-browser screenshot savings-check.png
