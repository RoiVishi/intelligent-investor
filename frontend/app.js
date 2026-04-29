async function calculate() {
 const salary = document.getElementById('salary').value;
 const years = document.getElementById('years').value;
 // POST to the backend — port 3001 because that is what
 // docker-compose.yml maps: '3001:5000'
 const response = await fetch('http://localhost:3001/calculate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 grossSalary: Number(salary),
 years: Number(years),
 }),
 });
 const data = await response.json();
 document.getElementById('output').textContent =
 JSON.stringify(data, null, 2);
}