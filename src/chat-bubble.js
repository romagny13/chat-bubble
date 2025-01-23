class ChatBubble {
    constructor(config = {}) {
      // Default styling options
      this.styles = {
        container: config.styles?.container || "chat-bubble-container",
        messageList: config.styles?.messageList || "chat-message-list",
        bubble: config.styles?.bubble || "chat-bubble",
        userBubble: config.styles?.userBubble || "user",
        botBubble: config.styles?.botBubble || "bot",
        timestamp: config.styles?.timestamp || "chat-bubble-timestamp",
        content: config.styles?.content || "chat-bubble-content",
      };

      // Animation configuration
      this.animations = {
        enabled: config.animations?.enabled !== false,
        userClass: config.animations?.userClass || "animate__fadeInUp",
        botClass: config.animations?.botClass || "animate__fadeInDown",
      };

      this.container = config.container || document.body;
      this.messages = config.initialMessages || [];
      this.theme = config.theme || "default";
      this.delayPerMessage = config.delayPerMessage || 400;
      this.maxVisibleMessages = config.maxVisibleMessages || 50;

      this._init();
    }

    _init() {
      this.chatContainer = document.createElement("div");
      this.chatContainer.className = `${this.styles.container} ${this.theme}`;
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

    _renderMessages() {
      this.messageList.innerHTML = "";

      let delay = 0;
      this.messages
        .slice(-this.maxVisibleMessages)
        .forEach((msg, index) => {
          setTimeout(() => {
            const bubble = document.createElement("div");
            bubble.className = `${this.styles.bubble} ${
              msg.sender === "user"
                ? this.styles.userBubble
                : this.styles.botBubble
            } ${this._getAnimationClass(msg.sender)}`;

            bubble.innerHTML = `
                <div class="${this.styles.content}">${msg.text}</div>
                <div class="${
                  this.styles.timestamp
                }">${this._formatTimestamp(msg.timestamp)}</div>
            `;
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
      const bubble = document.createElement("div");
      bubble.className = `${this.styles.bubble} ${
        message.sender === "user"
          ? this.styles.userBubble
          : this.styles.botBubble
      } ${this._getAnimationClass(message.sender)}`;

      bubble.innerHTML = `
        <div class="${this.styles.content}">${message.text}</div>
        <div class="${this.styles.timestamp}">${this._formatTimestamp(
        message.timestamp
      )}</div>
      `;
      this.messageList.appendChild(bubble);

      this.messageList.scrollTop = this.messageList.scrollHeight;

      if (this.messages.length > this.maxVisibleMessages) {
        this.messageList.removeChild(this.messageList.firstChild);
      }
    }

    _formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }

    addMessage(message) {
      this.messages.push(message);
      this._renderNewMessage(message);
    }
  }

