// Styled Button Utility - Creates buttons matching the game's visual style

export function createStyledButton(scene, x, y, text, onClick, config = {}) {
  const buttonWidth = config.width || 200;
  const buttonHeight = config.height || 50;
  const cornerRadius = config.cornerRadius || 15;
  const fontSize = config.fontSize || '18px';
  const disabled = config.disabled || false;

  // Create container for all button elements
  const container = scene.add.container(x, y);

  // Outer border (brown/tan)
  const outerBorder = scene.add.graphics();
  outerBorder.fillStyle(disabled ? 0x555555 : 0xB8956A, 1);
  outerBorder.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);
  container.add(outerBorder);

  // Inner border (darker brown)
  const innerBorder = scene.add.graphics();
  const borderThickness = 6;
  innerBorder.fillStyle(disabled ? 0x333333 : 0x6B4423, 1);
  innerBorder.fillRoundedRect(
    -buttonWidth / 2 + borderThickness,
    -buttonHeight / 2 + borderThickness,
    buttonWidth - borderThickness * 2,
    buttonHeight - borderThickness * 2,
    cornerRadius - 3
  );
  container.add(innerBorder);

  // Green fill
  const fillGraphics = scene.add.graphics();
  const fillPadding = 10;
  fillGraphics.fillStyle(disabled ? 0x666666 : 0x6BA965, 1);
  fillGraphics.fillRoundedRect(
    -buttonWidth / 2 + fillPadding,
    -buttonHeight / 2 + fillPadding,
    buttonWidth - fillPadding * 2,
    buttonHeight - fillPadding * 2,
    cornerRadius - 6
  );
  container.add(fillGraphics);

  // Button text with stroke
  const buttonText = scene.add.text(0, 0, text, {
    fontSize: fontSize,
    fill: disabled ? '#999999' : '#FFFFFF',
    fontFamily: 'Arial',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4
  });
  buttonText.setOrigin(0.5);
  container.add(buttonText);

  if (!disabled && onClick) {
    // Create invisible interactive area
    const hitArea = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Store original colors
    const normalFill = 0x6BA965;
    const hoverFill = 0x7DBB77;
    const pressFill = 0x5A8E55;

    // Hover effects
    hitArea.on('pointerover', () => {
      fillGraphics.clear();
      fillGraphics.fillStyle(hoverFill, 1);
      fillGraphics.fillRoundedRect(
        -buttonWidth / 2 + fillPadding,
        -buttonHeight / 2 + fillPadding,
        buttonWidth - fillPadding * 2,
        buttonHeight - fillPadding * 2,
        cornerRadius - 6
      );
    });

    hitArea.on('pointerout', () => {
      fillGraphics.clear();
      fillGraphics.fillStyle(normalFill, 1);
      fillGraphics.fillRoundedRect(
        -buttonWidth / 2 + fillPadding,
        -buttonHeight / 2 + fillPadding,
        buttonWidth - fillPadding * 2,
        buttonHeight - fillPadding * 2,
        cornerRadius - 6
      );
    });

    hitArea.on('pointerdown', () => {
      fillGraphics.clear();
      fillGraphics.fillStyle(pressFill, 1);
      fillGraphics.fillRoundedRect(
        -buttonWidth / 2 + fillPadding,
        -buttonHeight / 2 + fillPadding,
        buttonWidth - fillPadding * 2,
        buttonHeight - fillPadding * 2,
        cornerRadius - 6
      );
    });

    hitArea.on('pointerup', () => {
      fillGraphics.clear();
      fillGraphics.fillStyle(hoverFill, 1);
      fillGraphics.fillRoundedRect(
        -buttonWidth / 2 + fillPadding,
        -buttonHeight / 2 + fillPadding,
        buttonWidth - fillPadding * 2,
        buttonHeight - fillPadding * 2,
        cornerRadius - 6
      );
      onClick();
    });
  }

  // Store references for potential updates
  container.buttonText = buttonText;
  container.fillGraphics = fillGraphics;

  return container;
}
