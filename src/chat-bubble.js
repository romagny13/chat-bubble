class MessageQueue {
  constructor(options = {}) {
    this._config = {
      delayPerMessage: options.delayPerMessage || 400,
      onMessageProcess: options.onMessageProcess || (() => {}),
      onQueueComplete: options.onQueueComplete || (() => {})
    };
    this._queue = [];
    this._isSkipDelayEnabled = false; // Renommée pour éviter la confusion
    this._currentTimeout = null;
    this._isRunning = false;
  }

  // Getter pour vérifier si la queue est en cours d'exécution
  get isRunning() {
    return this._isRunning;
  }

  async _start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._processMessages();
  }

  async _processMessages() {
    while (this._queue.length > 0) {
      const message = this._queue.shift();
      await this._processMessage(message);
    }

    this._isRunning = false;
    this._config.onQueueComplete?.();
  }

  async _processMessage(message) {
    return new Promise((resolve) => {
      this._config.onMessageProcess?.(message);

      // Utiliser le délai spécifique du message si défini, sinon utiliser le délai par défaut
      const delay = message.delayPerMessage ?? this._config.delayPerMessage;

      // Si le délai est <= 0 ou si skipDelay est activé, traiter immédiatement
      if (this._isSkipDelayEnabled || delay <= 0) {
        resolve();
        return;
      }

      // Créer un setTimeout et sauvegarder la référence
      this._currentTimeout = setTimeout(() => {
        this._currentTimeout = null; // Nettoyer la référence une fois terminé
        resolve();
      }, delay);
    });
  }

  add(message) {
    this._queue.push(message);
    if (!this._isRunning) {
      this._start();
    }
  }

  cancel() {
    this._queue = [];
    this._isRunning = false;
    this._isSkipDelayEnabled = false;

    if (this._currentTimeout) {
      clearTimeout(this._currentTimeout);
      this._currentTimeout = null;
    }
  }

  skipDelay() {
    this._isSkipDelayEnabled = true;
    if (this._currentTimeout) {
      clearTimeout(this._currentTimeout);
      this._currentTimeout = null;
    }

    if (this._isRunning) {
      this._processMessages();
    }
  }
}

class ChatBubble {
  constructor(config = {}) {
    this.version = "2.1.0";
    // Ajouter le mode de personnage à la configuration
    this._config = {
      ...config,
      characterMode: config.characterMode || false,
      users: config.users || [],
      timestampFormat: config.timestampFormat || "time",
      delayPerMessage: config.delayPerMessage || 400,
      maxVisibleMessages: config.maxVisibleMessages || 50,
      characterMode: config.characterMode || false,
      hideBubbleImages: config.hideBubbleImages || false // Nouvelle option
    };

    // Autres configurations restent identiques
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
      onMessageProcess: (message) => this._renderNewMessage(message),
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

  _formatText(text) {
    // Remplacer les sauts de ligne par des balises <br>
    let formattedText = text.replace(/\n/g, "<br>");

    // Remplacer **bold** par <strong>bold</strong>
    formattedText = formattedText.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    // Remplacer *italic* par <em>italic</em>
    formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");

    return formattedText;
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
      ? `<div class="${this._styles.timestamp}">${this._formatTimestamp(
          message.timestamp
        )}</div>`
      : "";

    // Formatage du texte (ajout des balises HTML pour le formatage)
    const formattedText = this._formatText(message.text);

    bubble.innerHTML = `${imageContainer}
    <div class="${this._styles.senderName}">${user.name}</div>
    <div class="${this._styles.text}">${formattedText}</div>
    ${timestamp}`;

    return bubble;
  }

  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    switch (this._config.timestampFormat) {
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
}
