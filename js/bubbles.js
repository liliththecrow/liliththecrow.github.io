document.addEventListener('DOMContentLoaded', () => {
    // Inactivity timer variables
    let inactivityTime = 10 * 1000; // 10 seconds
    let inactivityTimer; // Timer to track inactivity

    // Overlay elements
    let overlay; // Overlay element
    let overlayActive = false; // Flag to track overlay state

    // Reset inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(handleInactiveUser, inactivityTime);
    }

    // Handle inactive user
    function handleInactiveUser() {
        console.log('User is inactive, show overlay.');

        // Show overlay
        if (!overlayActive) {
            overlay.style.display = 'block';
            overlayActive = true;

            console.log(overlay.style.display); // Check if overlay is set to display: block
        }
    }

    // Handle user interaction to reset inactivity timer
    function handleUserInteraction() {
        resetInactivityTimer();

        // Hide overlay if active
        if (overlayActive) {
            overlay.style.display = 'none';
            overlayActive = false;

            console.log(overlay.style.display); // Check if overlay is set to display: none
        }
    }

    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('mousedown', handleUserInteraction);
    document.addEventListener('keypress', handleUserInteraction);
    document.addEventListener('wheel', handleUserInteraction); // For scroll events

    // Initial setup
    function init() {
        // Create overlay
        overlay = document.createElement('div');
        overlay.className = 'overlay'; // Make sure 'overlay' class is defined in CSS
        document.body.appendChild(overlay);

        // Create and append the canvas for bubbles
        const canvas = document.createElement('canvas');
        canvas.id = 'bubblesCanvas';
        overlay.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const bubbleImage = new Image();
        bubbleImage.src = 'images/bubble.png';

        bubbleImage.onload = () => {
            console.log('Image loaded');
            initBubbles();
            animate();
        };

        bubbleImage.onerror = (error) => {
            console.error('Failed to load image', error);
        };

        const bubbles = [];
        const bubbleCount = 30; // Reduced bubble count
        const phaseDistance = bubbleSize / 2; // Allow bubbles to phase one radius into the wall

        const gravityDirections = [
            { x: 0, y: -2.5 }, // Up
            { x: 0, y: 2.5 }, // Down
            { x: -2.5, y: 0 }, // Left
            { x: 2.5, y: 0 }, // Right
            { x: -2.5, y: -2.5 }, // Up-left
            { x: 2.5, y: -2.5 }, // Up-right
            { x: -2.5, y: 2.5 }, // Down-left
            { x: 2.5, y: 2.5 }, // Down-right
        ];

        let currentGravityDirection = { x: 0, y: 0 }; // Starting direction
        let targetGravityDirection = { x: 0, y: -1 }; // Initial target direction
        let lastGravityDirectionIndex = 0; // Index of the last gravity direction

        class Bubble {
            constructor(x, y) {
                this.radius = bubbleSize;
                this.x = x;
                this.y = y;
                this.speedX = (Math.random() - 0.5) * 8; // Increased horizontal speed
                this.speedY = (Math.random() - 0.5) * 8; // Increased vertical speed
                this.opacity = Math.random() * 0.5 + 0.5;
                this.hue = Math.random() * 360; // Starting hue for color
                this.hueChangeRate = 0.5; // Constant rate of hue change
            }

            update() {
                this.x += this.speedX + currentGravityDirection.x * 0.5;
                this.y += this.speedY + currentGravityDirection.y * 0.5;
                this.hue += this.hueChangeRate; // Change hue over time
                if (this.hue > 360) this.hue -= 360;

                // Boundary collision with phase distance
                const phaseRadius = this.radius; // Allow bubble to phase one radius into the wall
                if (this.x - this.radius < -phaseRadius) {
                    this.x = -phaseRadius + this.radius;
                    this.speedX = -this.speedX;
                }
                if (this.x + this.radius > canvas.width + phaseRadius) {
                    this.x = canvas.width + phaseRadius - this.radius;
                    this.speedX = -this.speedX;
                }
                if (this.y - this.radius < -phaseRadius) {
                    this.y = -phaseRadius + this.radius;
                    this.speedY = -this.speedY;
                }
                if (this.y + this.radius > canvas.height + phaseRadius) {
                    this.y = canvas.height + phaseRadius - this.radius;
                    this.speedY = -this.speedY;
                }

                // Bubble collision
                for (let other of bubbles) {
                    if (this !== other && this.isCollidingWith(other)) {
                        // Resolve collision
                        this.resolveCollision(other);
                    }
                }
            }

            isCollidingWith(other) {
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < this.radius + other.radius;
            }

            resolveCollision(other) {
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Normal vector
                const nx = dx / distance;
                const ny = dy / distance;

                // Tangent vector
                const tx = -ny;
                const ty = nx;

                // Dot product tangent
                const dpTan1 = this.speedX * tx + this.speedY * ty;
                const dpTan2 = other.speedX * tx + other.speedY * ty;

                // Dot product normal
                const dpNorm1 = this.speedX * nx + this.speedY * ny;
                const dpNorm2 = other.speedX * nx + other.speedY * ny;

                // Conservation of momentum in 1D
                const m1 = (dpNorm1 * (this.radius - other.radius) + 2 * other.radius * dpNorm2) / (this.radius + other.radius);
                const m2 = (dpNorm2 * (other.radius - this.radius) + 2 * this.radius * dpNorm1) / (this.radius + other.radius);

                this.speedX = tx * dpTan1 + nx * m1;
                this.speedY = ty * dpTan1 + ny * m1;
                other.speedX = tx * dpTan2 + nx * m2;
                other.speedY = ty * dpTan2 + ny * m2;

                // Separate the bubbles to avoid overlap
                const overlap = this.radius + other.radius - distance;
                const smallShiftX = (nx * overlap) / 2;
                const smallShiftY = (ny * overlap) / 2;

                this.x += smallShiftX;
                this.y += smallShiftY;
                other.x -= smallShiftX;
                other.y -= smallShiftY;
            }

            draw() {
                // Create an off-screen canvas
                const offCanvas = document.createElement('canvas');
                const offCtx = offCanvas.getContext('2d');
                offCanvas.width = this.radius * 2;
                offCanvas.height = this.radius * 2;

                // Draw the image onto the off-screen canvas
                offCtx.drawImage(bubbleImage, 0, 0, this.radius * 2, this.radius * 2);

                // Apply hue rotation
                offCtx.globalCompositeOperation = 'source-in';
                offCtx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
                offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

                // Draw the off-screen canvas onto the main canvas
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(offCanvas, this.x - this.radius, this.y - this.radius);
                ctx.globalAlpha = 1; // Reset alpha
            }
        }

        function initBubbles() {
            while (bubbles.length > bubbleCount) {
                bubbles.pop(); // Remove extra bubbles
            }
            while (bubbles.length < bubbleCount) {
                const x = Math.random() * (canvas.width - bubbleSize * 2) + bubbleSize;
                const y = Math.random() * (canvas.height - bubbleSize * 2) + bubbleSize;
                bubbles.push(new Bubble(x, y));
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            bubbles.forEach(bubble => {
                bubble.update();
                bubble.draw();
            });
            updateGravityDirection();
            requestAnimationFrame(animate);
        }

        function changeGravityDirection() {
            let newGravityDirectionIndex;
            do {
                newGravityDirectionIndex = Math.floor(Math.random() * gravityDirections.length);
            } while (newGravityDirectionIndex === lastGravityDirectionIndex);

            targetGravityDirection = gravityDirections[newGravityDirectionIndex];
            lastGravityDirectionIndex = newGravityDirectionIndex;
        }

        function updateGravityDirection() {
            const step = 0.01; // Adjust the step value to control the smoothness of the transition
            const dx = targetGravityDirection.x - currentGravityDirection.x;
            const dy = targetGravityDirection.y - currentGravityDirection.y;

            if (Math.abs(dx) > step) {
                currentGravityDirection.x += step * Math.sign(dx);
            } else {
                currentGravityDirection.x = targetGravityDirection.x;
            }

            if (Math.abs(dy) > step) {
                currentGravityDirection.y += step * Math.sign(dy);
            } else {
                currentGravityDirection.y = targetGravityDirection.y;
            }
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initBubbles(); // Reinitialize bubbles on resize
        });

        // Initialize bubbles only once at the start
        initBubbles();

        // Start the animation
        animate();

        // Start changing gravity direction
        changeGravityDirection();
        setInterval(changeGravityDirection, 3500); // Change direction every 3.5 seconds

        // Set up initial inactivity timer
        resetInactivityTimer();
    }

    // Initialize the script only once
    if (!window.overlayInitialized) {
        window.overlayInitialized = true;
        init();
    }
});

