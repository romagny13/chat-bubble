class ChatBubble {
  constructor(config = {}) {
    // Default configuration
    this._config = {
      userName: config.userName || "user",
      botName: config.botName || "bot",
      timestampFormat: config.timestampFormat || "time",
      ...config,
    };

    // Styling options
    this._styles = {
      container: config.styles?.container || "chat-bubble-container",
      messageList: config.styles?.messageList || "chat-message-list",
      bubble: config.styles?.bubble || "chat-bubble",
      text : config.styles?.text || "chat-text",
      userBubble: config.styles?.userBubble || "user",
      botBubble: config.styles?.botBubble || "bot",
      timestamp: config.styles?.timestamp || "chat-bubble-timestamp",
      senderName: config.styles?.senderName || "sender-name",
      imageContainer:
        config.styles?.imageContainer || "chat-bubble-image-container",
    };

    // Animation configuration
    this._animations = {
      enabled: config.animations?.enabled !== false,
      userClass:
        config.animations?.userClass ||
        "animate__animated animate__fadeInRight",
      botClass:
        config.animations?.botClass || "animate__animated animate__fadeInLeft",
    };

    this._container = config.container || document.body;

    this._userStates = config.userStates || {
      default: config.userImage || null,
    };
    this._botStates = config.botStates || {
      default: config.botImage || null,
    };

    this._messages = (config.initialMessages || []).map((msg) => ({
      ...msg,
      state: msg.state || "default",
    }));

    this._delayPerMessage = config.delayPerMessage || 400;
    this._maxVisibleMessages = config.maxVisibleMessages || 50;

    this._init();
  }

  _init() {
    this._chatContainer = document.createElement("div");
    this._chatContainer.className = this._styles.container;
    this._container.appendChild(this._chatContainer);

    this._messageList = document.createElement("div");
    this._messageList.className = this._styles.messageList;
    this._chatContainer.appendChild(this._messageList);

    this._renderMessages();
  }

  _getAnimationClass(sender) {
    if (!this._animations.enabled) return "";
    return sender === "user"
      ? this._animations.userClass
      : this._animations.botClass;
  }

  _createImageContainer(sender, state) {
    const states = sender === "user" ? this._userStates : this._botStates;
    const imageSrc = states[state] || states["default"];

    if (!imageSrc) return "";

    return `
<div class="${this._styles.imageContainer}">
  <img src="${imageSrc}" alt="${sender} avatar" />
</div>
`;
  }

  _renderMessages() {
    this._messageList.innerHTML = "";

    let delay = 0;
    this._messages.slice(-this._maxVisibleMessages).forEach((msg) => {
      setTimeout(() => {
        this._addMessageBubble(msg);
      }, delay);
      delay += this._delayPerMessage;
    });

    if (this._messages.length > this._maxVisibleMessages) {
      this._messages = this._messages.slice(-this._maxVisibleMessages);
    }
  }

  _renderNewMessage(message) {
    this._addMessageBubble(message);

    if (this._messages.length > this._maxVisibleMessages) {
      this._messageList.removeChild(this._messageList.firstChild);
    }
  }

  _addMessageBubble(message) {
    const bubble = this._createMessageBubble(message);
    this._messageList.appendChild(bubble);
    this._chatContainer.scrollTop = this._chatContainer.scrollHeight;
    this._config.onMessageAdded?.(bubble);
  }

  _createMessageBubble(message) {
    const bubble = document.createElement("div");
    bubble.className = `${this._styles.bubble} ${
      message.sender === "user"
        ? this._styles.userBubble
        : this._styles.botBubble
    } ${this._getAnimationClass(message.sender)}`;

    const senderName =
      message.sender === "user" ? this._config.userName : this._config.botName;

    const imageContainer = this._createImageContainer(
      message.sender,
      message.state
    );

    const timestamp = message.timestamp
      ? `<div class="${this._styles.timestamp}">${this._formatTimestamp(
          message.timestamp
        )}</div>`
      : "";

    bubble.innerHTML = `
${imageContainer}
<div class="${this._styles.senderName}">${senderName}</div>
<div class="${this._styles.text}">${message.text}</div>
${timestamp}
`;

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
          minute: "2-digit",
        });

      case "relative":
        return this._getRelativeTime(date);

      case "time":
      default:
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
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
    this._renderNewMessage(message);
  }
}
