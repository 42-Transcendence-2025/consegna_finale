export class Player
{
    constructor(game)
	{
        this.game = game;
        this.upKey = false;
        this.downKey = false;
        this.initControls();
    }

    initControls()
	{
        document.addEventListener("keydown", (event) =>
		{
            if (event.key === "ArrowUp")
			{
                this.upKey = true;
            }
			else if (event.key === "ArrowDown")
			{
                this.downKey = true;
            }
        });

        document.addEventListener("keyup", (event) =>
		{
            if (event.key === "ArrowUp")
			{
                this.upKey = false;
            }
			else if (event.key === "ArrowDown")
			{
                this.downKey = false;
            }
        });
    }

    update()
	{
        if (this.upKey && this.game.state.leftPaddle.y > 0)
		{
            this.game.state.leftPaddle.y -= this.game.paddleSpeed;
        }
        if (this.downKey && this.game.state.leftPaddle.y < this.game.canvas.height - this.game.paddleHeight)
		{
            this.game.state.leftPaddle.y += this.game.paddleSpeed;
        }
    }
}
