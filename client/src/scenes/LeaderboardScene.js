import { createRun } from "../api/api";
import { getOrCreatePlayerId } from "../utils/playerId";
import { getLeaderboard } from "../api/api";
import Phaser from "phaser";

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
    // HTML input for initials
    this.initialsInput = null;
    // Prevent Enter spam while score is saving
    this.isSubmitting = false;
  }

  preload() {
    this.load.audio("gameOverMusic", "/assets/audio/game-over.mp3");
  }

  init(data) {
    this.currentScore = data.score || 0;
    this.currentDuration = data.duration || 0;
  }

  async create() {
    // Reuse the game-over track in this scene, but remove any existing tracks first.
    const existingMainMusic = this.sound.get("mainBgm");
    if (existingMainMusic) {
      existingMainMusic.stop();
      this.sound.remove(existingMainMusic);
    }

    const existingGameOverMusic = this.sound.get("gameOverMusic");
    if (existingGameOverMusic) {
      this.sound.remove(existingGameOverMusic);
    }

    this.bgm = this.sound.add("gameOverMusic", {
      loop: true,
      volume: 0.5,
    });
    this.bgm.play();

    this.titleText = this.add
      .text(640, 100, "Enter Initials", {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(640, 145, `Score: ${this.currentScore}`, {
        fontSize: "26px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.submitHintText = this.add
      .text(640, 235, "Press ENTER to submit", {
        fontSize: "20px",
        color: "#fff",
      })
      .setOrigin(0.5);

    // Create a normal HTML input so typing works naturally.
    this.createInitialsInput();
  }

  createInitialsInput() {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 3;
    input.placeholder = "AAA";
    input.autocomplete = "off";
    input.autocapitalize = "characters";
    input.spellcheck = false;
    input.style.position = "absolute";
    input.style.width = "200px";
    input.style.height = "56px";
    input.style.padding = "0 16px";
    input.style.border = "2px solid #ffffff";
    input.style.borderRadius = "10px";
    input.style.background = "rgba(0, 0, 0, 0.45)";
    input.style.color = "#ffffff";
    input.style.fontFamily = "'Courier New', monospace";
    input.style.fontSize = "30px";
    input.style.fontWeight = "700";
    input.style.letterSpacing = "8px";
    input.style.textAlign = "center";
    input.style.textTransform = "uppercase";
    input.style.outline = "none";
    input.style.zIndex = "10";
    input.style.boxSizing = "border-box";
    input.style.caretColor = "#ffd84d";

    document.body.appendChild(input);
    this.initialsInput = input;
    this.positionInput();
    input.focus();

    // Allow only 3 uppercase letters.
    input.addEventListener("input", () => {
      input.value = input.value
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 3);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.submitInitials();
      }
    });
  }

  positionInput() {
    if (!this.initialsInput) return;

    // Put input near top-center of the game canvas.
    const canvasRect = this.game.canvas.getBoundingClientRect();
    this.initialsInput.style.left = `${canvasRect.left + canvasRect.width / 2}px`;
    this.initialsInput.style.top = `${canvasRect.top + 190}px`;
    this.initialsInput.style.transform = "translate(-50%, -50%)";
  }

  async submitInitials() {
    if (!this.initialsInput || this.isSubmitting) return;

    const initials = this.initialsInput.value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3);

    if (!initials) return;

    this.isSubmitting = true;
    this.submitHintText?.setText("Saving...");

    const playerId = getOrCreatePlayerId();

    try {
      await createRun({
        playerId,
        initials,
        score: this.currentScore,
        durationMs: this.currentDuration,
      });
    } catch (error) {
      console.error("Failed to save run:", error);
    }

    this.clearEntryUI();
    this.showLeaderboard();
  }

  clearEntryUI() {
    // Remove input + the texts from the enter-initials step.
    this.removeInitialsInput();
    this.titleText?.destroy();
    this.scoreText?.destroy();
    this.submitHintText?.destroy();
    this.titleText = null;
    this.scoreText = null;
    this.submitHintText = null;
  }

  removeInitialsInput() {
    if (this.initialsInput) {
      this.initialsInput.remove();
      this.initialsInput = null;
    }
    this.isSubmitting = false;
  }

  async showLeaderboard() {
    // Safety: clean up entry UI before drawing leaderboard.
    this.clearEntryUI();

    const scores = await getLeaderboard();

    this.add
      .text(640, 260, "Leaderboard", {
        fontSize: "36px",
        color: "#fff",
      })
      .setOrigin(0.5);

    scores.slice(0, 5).forEach((entry, index) => {
      this.add
        .text(640, 320 + index * 40, `${entry.initials}: ${entry.score}`, {
          fontSize: "28px",
          color: "#fff",
        })
        .setOrigin(0.5);
    });

    this.input.keyboard.once("keydown-SPACE", () => {
      this.removeInitialsInput();
      if (this.bgm) {
        this.bgm.stop();
      }
      this.scene.start("StartScene");
    });

    this.add
      .text(640, 550, "Press SPACE to Restart", {
        fontSize: "24px",
        color: "#fff",
      })
      .setOrigin(0.5);
  }
}
