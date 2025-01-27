class MessageQueue {
  constructor(options = {}) {
    this._config = {
      delayPerMessage: options.delayPerMessage || 400,
      onMessageProcess: options.onMessageProcess || (() => {}),
      onPause: options.onPause || (() => {}),
      onQueueComplete: options.onQueueComplete || (() => {}),
      autoplay: options.autoplay ?? true // Lecture automatique activée par défaut
    };
    this._queue = [];
    this._isPaused = !this._config.autoplay; // Si autoplay est false, démarre en pause
    this._isSkipDelayEnabled = false;
    this._currentTimeout = null;
    this._isRunning = false;
  }

  get isRunning() {
    return this._isRunning && !this._isPaused;
  }

  async _start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._processMessages();
  }

  async _processMessages() {
    if (this._isPaused) return;

    while (this._queue.length > 0 && !this._isPaused) {
      const message = this._queue.shift();
      await this._processMessage(message);
      if (message.pauseAfter) {
        // Utilisation de pauseAfter
        this.pause();
        return;
      }
    }

    // Si la queue est vide ou pause, arrête le process
    this._isRunning = this._queue.length > 0;
    if (!this._isRunning && !this._isPaused) {
      this._config.onQueueComplete?.();
    }
  }

  async _processMessage(message) {
    return new Promise((resolve) => {
      this._config.onMessageProcess?.(message);

      const delay = message.delayPerMessage ?? this._config.delayPerMessage;
      if (this._isSkipDelayEnabled || delay <= 0) {
        resolve();
        return;
      }

      this._currentTimeout = setTimeout(() => {
        this._currentTimeout = null;
        resolve();
      }, delay);
    });
  }

  _clearCurrentTimeout() {
    if (this._currentTimeout) {
      clearTimeout(this._currentTimeout);
      this._currentTimeout = null;
    }
  }

  add(message) {
    this._queue.push(message);
    if (!this._isRunning && !this._isPaused) {
      this._start();
    }
  }

  cancel() {
    this._queue = [];
    this._isRunning = false;
    this._isPaused = false;
    this._isSkipDelayEnabled = false;

    this._clearCurrentTimeout();
  }

  skipDelay() {
    this._isSkipDelayEnabled = true;
    this._clearCurrentTimeout();

    if (this._isRunning) {
      this._processMessages();
    }
  }

  pause() {
    this._isPaused = true;
    this._clearCurrentTimeout();
    this._config.onPause?.();
  }

  resume() {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._processMessages();
  }
}

class TextFormatterService {
  formatText(text) {
    let formattedText = text.replace(/\n/g, "<br>");
    formattedText = formattedText.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );
    formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");
    return formattedText;
  }
}

class TimestampFormatterService {
  formatTimestamp(timestamp, timestampFormat = "time") {
    const date = new Date(timestamp);
    switch (timestampFormat) {
      case "datetime":
        return date.toLocaleString([], {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

      case "relative":
        return this._getRelativeTime(date);

      case "time":
      default:
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });
    }
  }

  _getRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.round((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    return date.toLocaleDateString();
  }
}

class ChatBubble {
  constructor(config = {}) {
    this.version = "2.5.0";

    const defaultTextFormatter = new TextFormatterService();
    const defaultTimestampFormatter = new TimestampFormatterService();

    this._config = {
      ...config,
      users: config.users || [],
      autoplay: config.autoplay ?? true, // Lecture automatique activée par défaut
      onPause: config.onPause,
      timestampFormat: config.timestampFormat || "time",
      delayPerMessage: config.delayPerMessage || 400,
      maxVisibleMessages: config.maxVisibleMessages || 50,
      characterMode: config.characterMode || false,
      hideBubbleImages: config.hideBubbleImages || false,
      // Injection des services par défaut
      textFormatter: config.textFormatter || defaultTextFormatter,
      timestampFormatter: config.timestampFormatter || defaultTimestampFormatter
    };

    this._styles = {
      container: "chat-bubble-container",
      messageList: "chat-message-list",
      bubble: "chat-bubble",
      text: "chat-text",
      userBubble: "user",
      botBubble: "bot",
      timestamp: "chat-bubble-timestamp",
      senderName: "sender-name",
      imageContainer: "chat-bubble-image-container"
    };

    this._animations = {
      enabled: config.animations?.enabled !== false,
      userClass: "animate__animated animate__fadeInRight",
      botClass: "animate__animated animate__fadeInLeft"
    };

    this._container = config.container || document.body;
    this._messages = (config.initialMessages || []).map((msg) => ({
      ...msg,
      state: msg.state || "default"
    }));

    this._messageQueue = new MessageQueue({
      delayPerMessage: this._config.delayPerMessage,
      autoplay: this._config.autoplay,
      onMessageProcess: (message) => this._renderNewMessage(message),
      onPause: () => this._config.onPause?.(),
      onQueueComplete: () => this._config.onQueueComplete?.()
    });

    this._init();

    // Mode personnage : créer des conteneurs de personnages
    if (this._config.characterMode) {
      this._createCharacterContainers();
    }

    this._messages.forEach((message) => this._messageQueue.add(message));
  }

  _init() {
    this._chatContainer = document.createElement("div");
    this._chatContainer.className = this._styles.container;
    this._container.appendChild(this._chatContainer);

    this._messageList = document.createElement("div");
    this._messageList.className = this._styles.messageList;
    this._chatContainer.appendChild(this._messageList);
  }

  _getUser(userId) {
    return this._config.users.find((user) => user.id === userId);
  }

  _getAnimationClass(type) {
    if (!this._animations.enabled) return "";
    return type === "user"
      ? this._animations.userClass
      : this._animations.botClass;
  }

  _createImageContainer(userId, state) {
    const user = this._getUser(userId);
    if (!user) return "";

    const imageSrc = user.images
      ? user.images[state] || user.images["default"]
      : null;
    if (!imageSrc) return "";

    return `
  <div class="${this._styles.imageContainer}">
  <img src="${imageSrc}" alt="${user.name} avatar" />
  </div>
  `;
  }

  _createCharacterContainers() {
    this._botCharacterContainer = document.createElement("div");
    this._botCharacterContainer.className = "character-container bot-character";
    this._userCharacterContainer = document.createElement("div");
    this._userCharacterContainer.className =
      "character-container user-character";

    // Insérer les conteneurs avant et après la liste de messages
    this._chatContainer.insertBefore(
      this._botCharacterContainer,
      this._messageList
    );
    this._chatContainer.appendChild(this._userCharacterContainer);
  }

  _updateCharacterImages(message) {
    if (!this._config.characterMode) return;

    const user = this._getUser(message.userId);
    const imageSrc = user.images[message.state] || user.images["default"];

    const container =
      user.type === "user"
        ? this._userCharacterContainer
        : this._botCharacterContainer;

    container.innerHTML = `<img src="${imageSrc}" alt="${user.name} character">`;
  }

  _renderNewMessage(message) {
    this._updateCharacterImages(message);
    const bubble = this._createMessageBubble(message);
    this._messageList.appendChild(bubble);

    if (this._messageList.children.length > this._config.maxVisibleMessages) {
      this._messageList.removeChild(this._messageList.firstChild);
    }

    const scrollContainer = this._config.characterMode
      ? this._messageList
      : this._chatContainer;

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth"
    });
    this._config.onMessageAdded?.(bubble);
  }

  _createMessageBubble(message) {
    const user = this._getUser(message.userId);
    if (!user) {
      throw new Error(`User with userId "${message.userId}" not found.`);
    }

    const bubble = document.createElement("div");
    bubble.className = `${this._styles.bubble} ${
      user.type === "user" ? this._styles.userBubble : this._styles.botBubble
    } ${this._getAnimationClass(user.type)}`;

    // Modifier la création de l'image
    const imageContainer = this._config.hideBubbleImages
      ? ""
      : this._createImageContainer(message.userId, message.state);

    const timestamp = message.timestamp
      ? `<div class="${
          this._styles.timestamp
        }">${this._config.timestampFormatter.formatTimestamp(
          message.timestamp,
          this._config.timestampFormat
        )}</div>`
      : "";

    // Formatage du texte (ajout des balises HTML pour le formatage)
    const formattedText = this._config.textFormatter.formatText(message.text);

    bubble.innerHTML = `${imageContainer}
      <div class="${this._styles.senderName}">${user.name}</div>
      <div class="${this._styles.text}">${formattedText}</div>
      ${timestamp}`;

    return bubble;
  }

  addMessage(message) {
    this._messages.push(message);
    this._messageQueue.add(message);
  }

  cancelMessages() {
    this._messageQueue.cancel();
    this._messageList.innerHTML = "";
  }

  replayMessages() {
    this.cancelMessages();
    this._messageQueue._defaultDelay = this._config.delayPerMessage;
    this._messages.forEach((message) => this._messageQueue.add(message));
  }

  skipDelay() {
    this._messageQueue.skipDelay();
  }

  pauseMessages() {
    this._messageQueue.pause();
  }

  resumeMessages() {
    this._messageQueue.resume();
  }
}
