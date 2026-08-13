console.log("Vehicle-to-Grid Smart Energy Exchange Simulation initialized.");
const canvas = document.getElementById('simCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ccfbf1';
    ctx.font = '20px Arial';
    ctx.fillText('Bidirectional V2G Power Exchange Canvas', 220, 200);
}
