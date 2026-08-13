console.log("Battery Aging and Health Prediction Simulation initialized.");
const canvas = document.getElementById('simCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ef4444';
    ctx.font = '20px Arial';
    ctx.fillText('Battery Aging & SOH Curve Simulation', 230, 200);
}
