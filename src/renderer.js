document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector(".Input");
    const button = document.querySelector(".Set");
    const remainingText = document.querySelector(".Remaining");
    const progressBar = document.querySelector(".pro");
    const container = document.querySelector(".container");
    const progressBarContainer = document.querySelector(".Progressbar");
    const title = document.querySelector(".Title");
    
    let isRunning = false;

    const trayInfo = document.createElement("div");
    trayInfo.className = "tray-info";
    trayInfo.innerHTML = "App continues to run in the background";
    trayInfo.style.opacity = "0";
    container.appendChild(trayInfo);
    
    title.addEventListener("mouseenter", () => {
        trayInfo.style.opacity = "1";
    });
    
    title.addEventListener("mouseleave", () => {
        trayInfo.style.opacity = "0";
    });
    
    const closeInfo = document.createElement("div");
    closeInfo.className = "close-info";
    closeInfo.innerHTML = "ⓘ To exit via tray icon > Exit";
    closeInfo.style.opacity = "0.7";
    container.appendChild(closeInfo);
    
    setTimeout(() => {
        closeInfo.style.opacity = "0";
    }, 5000);

    remainingText.textContent = "Enter minutes to start";
    progressBar.style.width = "0%";
    
    input.focus();

    function toggleTimer() {
        if (isRunning) {
            window.electronAPI.startTimer(0);
            button.textContent = "SET";
            input.disabled = false;
            input.focus();
            return;
        }
        
        let minutes = parseInt(input.value);
        if (isNaN(minutes) || minutes <= 0) {
            input.classList.add("error");
            setTimeout(() => input.classList.remove("error"), 500);
            return;
        }
        
        if (minutes > 180) {
            minutes = 180;
            input.value = minutes;
        }
        
        button.textContent = "STOP";
        input.disabled = true;
        window.electronAPI.startTimer(minutes);
    }

    button.addEventListener("click", toggleTimer);
    
    input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            toggleTimer();
        }
        
        if (input.classList.contains("error")) {
            input.classList.remove("error");
        }
    });
    
    input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "");
    });

    window.electronAPI.onTimerUpdated((event, data) => {
        isRunning = true;
        
        let minutes = data.minutes;
        let seconds = data.seconds;
        
        let formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        let formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        
        remainingText.textContent = `${formattedMinutes}:${formattedSeconds} remaining`;
        progressBar.style.width = `${data.progress}%`;
        progressBarContainer.setAttribute('aria-valuenow', Math.round(data.progress));
        
        document.title = `${formattedMinutes}:${formattedSeconds} - Timer App`;
        
        if (data.progress > 80) {
            progressBar.style.background = "rgba(169, 27, 27, 0.6)";
        } else if (data.progress > 50) {
            progressBar.style.background = "rgba(169, 143, 27, 0.6)";
        }
    });
    
    window.electronAPI.onTimerStarted((event) => {
        isRunning = true;
        progressBar.style.background = "rgba(27, 169, 112, 0.6)";
    });
    
    window.electronAPI.onTimerStopped((event) => {
        isRunning = false;
        remainingText.textContent = "Timer stopped";
        progressBar.style.width = "0%";
        progressBarContainer.setAttribute('aria-valuenow', 0);
        document.title = "Timer App | by Hyper";
    });

    window.electronAPI.onTimerFinished((event) => {
        isRunning = false;
        remainingText.textContent = "Time is up!";
        progressBar.style.width = "100%";
        progressBarContainer.setAttribute('aria-valuenow', 100);
        progressBar.style.background = "rgba(169, 27, 27, 0.6)";
        button.textContent = "SET";
        input.disabled = false;
        document.title = "⏰ Timer Done! - Timer App";
        
        container.classList.add("flash");
        setTimeout(() => container.classList.remove("flash"), 3000);
        
        try {
            const audio = new Audio("image/notification.mp3");
            audio.play().catch(e => console.error("Could not play notification sound", e));
        } catch (e) {
            console.error("Error playing notification sound", e);
        }
    });
});