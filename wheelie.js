(function() {
  function Wheelie(selectElement, config) {
    // Allow passing a selector string or an element reference
    this.selectElement =
      typeof selectElement === "string"
        ? document.querySelector(selectElement)
        : selectElement;
    if (!this.selectElement) {
      console.error("Wheelie: select element not found");
      return;
    }

    // Optional configuration (optionHeight, etc.)
    this.optionHeight = (config && config.optionHeight) || 40;
    this.sensitivity = (config && config.sensitivity) || 0.2; // Sensitivity for mouse wheel

    // Hide the original <select>
    this.selectElement.style.display = "none";

    // Create the main container
    this.container = document.createElement("div");
    this.container.className = "wheelie-container";

    // Create the inner container for the options
    this.optionsContainer = document.createElement("div");
    this.optionsContainer.className = "wheelie-options";

    // Build wheel items from the <option> elements
    this.options = [];
    const optionElements = this.selectElement.querySelectorAll("option");
    for (let i = 0; i < optionElements.length; i++) {
      const opt = optionElements[i];
      const div = document.createElement("div");
      div.className = "wheelie-option";
      div.textContent = opt.textContent;
      div.dataset.value = opt.value;
      this.options.push(div);
      this.optionsContainer.appendChild(div);
    }

    // Append the options container into the main container
    this.container.appendChild(this.optionsContainer);
    // Insert container after the original <select>
    this.selectElement.parentNode.insertBefore(
      this.container,
      this.selectElement.nextSibling
    );

    // Create overlay for fade + center highlight
    this.createOverlay();

    // Dynamically calculate the height based on the number of options
    this.setupDimensions();
    this.setOffsetForIndex(this.currentIndex || 0, false);

    // Initialize event listeners
    this.initEvents();

    // Apply initial styling for selection
    this.updateSelection();
  }

  // Create overlay with top/bottom fades and center highlight bar
  Wheelie.prototype.createOverlay = function() {
    this.overlay = document.createElement("div");
    this.overlay.className = "wheelie-overlay";
    this.container.appendChild(this.overlay);

    this.centerHighlight = document.createElement("div");
    this.centerHighlight.className = "wheelie-center-highlight";
    this.overlay.appendChild(this.centerHighlight);
  };

  // Measure container height & set up for centering logic
  Wheelie.prototype.setupDimensions = function() {
    // Calculate the height dynamically based on the number of options
    this.containerHeight = this.optionHeight * 5; // Default height to fit 5 options
    this.containerCenter = this.containerHeight / 2; // The middle of the container
    this.itemCenter = this.optionHeight / 2; // The middle of an option row

    // Set the container height dynamically
    this.container.style.height = `${this.containerHeight}px`;

    // Update center position of the container
    this.centerHighlight.style.height = `${this.optionHeight}px`;
  };

  // Position the .wheelie-options so that item `index` is in the center
  Wheelie.prototype.setOffsetForIndex = function(index, animated) {
    const offset = this.containerCenter - (index * this.optionHeight) - this.itemCenter;
    this.currentOffset = offset;

    if (animated) {
      this.optionsContainer.style.transition = "transform 0.4s ease-out";
    } else {
      this.optionsContainer.style.transition = "none";
    }
    this.optionsContainer.style.transform = `translateY(${offset}px)`;
  };

  Wheelie.prototype.initEvents = function() {
    let self = this;
    let startY = 0;
    let initialOffset = 0;
    let isDragging = false;

    // Mouse down
    this.container.addEventListener("mousedown", function(e) {
      isDragging = true;
      startY = e.clientY;
      initialOffset = self.currentOffset;
      e.preventDefault();
    });

    // Mouse move
    document.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      const delta = e.clientY - startY;
      self.currentOffset = initialOffset + delta;
      self.optionsContainer.style.transition = "none";
      self.optionsContainer.style.transform = `translateY(${self.currentOffset}px)`;
    });

    // Mouse up
    document.addEventListener("mouseup", function() {
      if (isDragging) {
        isDragging = false;
        self.snapToNearest();
      }
    });

    // Touch start
    this.container.addEventListener("touchstart", function(e) {
      isDragging = true;
      startY = e.touches[0].clientY;
      initialOffset = self.currentOffset;
      e.preventDefault();
    });

    // Touch move
    this.container.addEventListener("touchmove", function(e) {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - startY;
      self.currentOffset = initialOffset + delta;
      self.optionsContainer.style.transition = "none";
      self.optionsContainer.style.transform = `translateY(${self.currentOffset}px)`;
    });

    // Touch end
    this.container.addEventListener("touchend", function() {
      if (isDragging) {
        isDragging = false;
        self.snapToNearest();
      }
    });

    // Mouse wheel
    this.container.addEventListener("wheel", function(e) {
      e.preventDefault();
      self.currentOffset -= e.deltaY * self.sensitivity;
      self.optionsContainer.style.transition = "none";
      self.optionsContainer.style.transform = `translateY(${self.currentOffset}px)`;

      clearTimeout(self.wheelTimer);
      self.wheelTimer = setTimeout(function() {
        self.snapToNearest();
      }, 100);
    });
  };

  // Snap to the nearest option index
  Wheelie.prototype.snapToNearest = function() {
    let rawIndex = (this.containerCenter - this.itemCenter - this.currentOffset) / this.optionHeight;
    let index = Math.round(rawIndex);

    // Clamp index
    if (index < 0) index = 0;
    if (index > this.options.length - 1) index = this.options.length - 1;

    this.currentIndex = index;
    this.setOffsetForIndex(index, true); // animate

    // Update <select> & highlight
    this.updateSelect();
    this.updateSelection();
  };

  Wheelie.prototype.updateSelect = function() {
    const opts = this.selectElement.options;
    for (let i = 0; i < opts.length; i++) {
      opts[i].selected = false;
    }
    if (opts[this.currentIndex]) {
      opts[this.currentIndex].selected = true;
      // Fire a change event
      const event = document.createEvent("HTMLEvents");
      event.initEvent("change", true, true);
      this.selectElement.dispatchEvent(event);
    }
  };

  // Dynamically style each option based on distance from the selected index
  Wheelie.prototype.updateSelection = function() {
    for (let i = 0; i < this.options.length; i++) {
      const distance = Math.abs(i - this.currentIndex);

      // The selected item (distance=0): largest font, darkest color
      if (distance === 0) {
        this.options[i].style.fontSize = "18px";
        this.options[i].style.color = "#000";
      }
      // One away (distance=1): slightly smaller font, somewhat faded color
      else if (distance === 1) {
        this.options[i].style.fontSize = "16px";
        this.options[i].style.color = "rgba(0, 0, 0, 0.7)";
      }
      // Two away (distance=2): smaller yet, more faded
      else if (distance === 2) {
        this.options[i].style.fontSize = "14px";
        this.options[i].style.color = "rgba(0, 0, 0, 0.4)";
      }
      // More than two away: smallest/faintest
      else {
        this.options[i].style.fontSize = "12px";
        this.options[i].style.color = "rgba(0, 0, 0, 0.2)";
      }
    }
  };

  // Expose globally
  window.Wheelie = Wheelie;
})();
