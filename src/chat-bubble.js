class ChatBubble {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      userName: config.userName || "user",
      botName: config.botName || "bot",
      timestampFormat: config.timestampFormat || "time",
      ...config,
    };

    // Styling options
    this.styles = {
      container: config.styles?.container || "chat-bubble-container",
      messageList: config.styles?.messageList || "chat-message-list",
      bubble: config.styles?.bubble || "chat-bubble",
      userBubble: config.styles?.userBubble || "user",
      botBubble: config.styles?.botBubble || "bot",
      timestamp: config.styles?.timestamp || "chat-bubble-timestamp",
      senderName: config.styles?.senderName || "sender-name",
      imageContainer:
        config.styles?.imageContainer || "chat-bubble-image-container",
    };

    // Animation configuration
    this.animations = {
      enabled: config.animations?.enabled !== false,
      userClass:
        config.animations?.userClass ||
        "animate__animated animate__fadeInRight",
      botClass:
        config.animations?.botClass ||
        "animate__animated animate__fadeInLeft",
    };

    this.container = config.container || document.body;

    // New: Support for state-based images
    this.userStates = config.userStates || {
      default: config.userImage || null,
    };
    this.botStates = config.botStates || {
      default: config.botImage || null,
    };

    // Modified to support initial messages with states
    this.messages = (config.initialMessages || []).map((msg) => ({
      ...msg,
      state: msg.state || "default",
    }));

    this.delayPerMessage = config.delayPerMessage || 400;
    this.maxVisibleMessages = config.maxVisibleMessages || 50;

    this._init();
  }

  _init() {
    this.chatContainer = document.createElement("div");
    this.chatContainer.className = this.styles.container;
    this.container.appendChild(this.chatContainer);

    this.messageList = document.createElement("div");
    this.messageList.className = this.styles.messageList;
    this.chatContainer.appendChild(this.messageList);

    this._renderMessages();
  }

  _getAnimationClass(sender) {
    if (!this.animations.enabled) return "";
    return sender === "user"
      ? this.animations.userClass
      : this.animations.botClass;
  }

  _createImageContainer(sender, state) {
    // Get image based on sender and state
    const states = sender === "user" ? this.userStates : this.botStates;
    const imageSrc = states[state] || states["default"];

    if (!imageSrc) return "";

    return `
<div class="${this.styles.imageContainer}">
  <img src="${imageSrc}" alt="${sender} avatar" />
</div>
`;
  }

  _renderMessages() {
    this.messageList.innerHTML = "";

    let delay = 0;
    this.messages.slice(-this.maxVisibleMessages).forEach((msg) => {
      setTimeout(() => {
        const bubble = this._createMessageBubble(msg);
        this.messageList.appendChild(bubble);
        this.messageList.scrollTop = this.messageList.scrollHeight;
      }, delay);
      delay += this.delayPerMessage;
    });

    if (this.messages.length > this.maxVisibleMessages) {
      this.messages = this.messages.slice(-this.maxVisibleMessages);
    }
  }

  _renderNewMessage(message) {
    const bubble = this._createMessageBubble(message);
    this.messageList.appendChild(bubble);
    this.messageList.scrollTop = this.messageList.scrollHeight;

    if (this.messages.length > this.maxVisibleMessages) {
      this.messageList.removeChild(this.messageList.firstChild);
    }
  }

  _createMessageBubble(message) {
    const bubble = document.createElement("div");
    bubble.className = `${this.styles.bubble} ${
      message.sender === "user"
        ? this.styles.userBubble
        : this.styles.botBubble
    } ${this._getAnimationClass(message.sender)}`;

    const senderName =
      message.sender === "user"
        ? this.config.userName
        : this.config.botName;

    const imageContainer = this._createImageContainer(
      message.sender,
      message.state
    );

    const timestamp = message.timestamp
      ? `<div class="${this.styles.timestamp}">${this._formatTimestamp(
          message.timestamp
        )}</div>`
      : "";

    bubble.innerHTML = `
${imageContainer}
<div class="${this.styles.senderName}">${senderName}</div>
<div>${message.text}</div>
${timestamp}
`;

    return bubble;
  }

  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);

    switch (this.config.timestampFormat) {
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
    this.messages.push(message);
    this._renderNewMessage(message);
  }
}
