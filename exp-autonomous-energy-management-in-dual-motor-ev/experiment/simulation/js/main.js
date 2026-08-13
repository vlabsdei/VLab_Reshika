console.log("Autonomous Energy Management in Dual-Motor EV initialized.");
const canvas = document.getElementById('simCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#48cae4';
    ctx.font = '20px Arial';
    ctx.fillText('Dual-Motor Torque Allocation Canvas', 230, 200);
}
