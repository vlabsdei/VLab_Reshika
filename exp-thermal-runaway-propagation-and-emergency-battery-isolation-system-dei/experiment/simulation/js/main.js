console.log("Thermal Runaway Propagation and EBIS Isolation Simulation initialized.");
const canvas = document.getElementById('simCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#dc2626';
    ctx.font = '20px Arial';
    ctx.fillText('Thermal Runaway & EBIS Module Canvas', 220, 200);
}
