import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _wonGame: { A: boolean; B: boolean; C: boolean };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  public constructor() {
    super({
      moves: [],
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: Array(3)
          .fill(null)
          .map(() => Array(3).fill(false)),
        B: Array(3)
          .fill(null)
          .map(() => Array(3).fill(false)),
        C: Array(3)
          .fill(null)
          .map(() => Array(3).fill(false)),
      },
    });

    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };

    this._wonGame = {
      A: false,
      B: false,
      C: false,
    };

    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
  }

  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }

    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };
      for (const board of ['A', 'B', 'C'] as const) {
        this._games[board].join(player);
      }
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };
      for (const board of ['A', 'B', 'C'] as const) {
        this._games[board].join(player);
      }
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }

    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
  }

  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    // Handles case where the game has not started yet
    if (this.state.o === undefined) {
      this.state = {
        oScore: 0,
        publiclyVisible: { A: [], B: [], C: [] },
        xScore: 0,
        moves: [],
        status: 'WAITING_TO_START',
      };
      for (const board of ['A', 'B', 'C'] as const) {
        this._games[board].leave(player);
      }
      return;
    }
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
    for (const board of ['A', 'B', 'C'] as const) {
      this._games[board].leave(player);
    }
  }

  /**
   * Checks that the given move is "valid": that it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    // check if game exists
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }

    // check if it is the correct turn
    const currentPlayer = this._moveCount % 2 === 0 ? this.state.x : this.state.o;
    if (move.playerID !== currentPlayer) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    // check if the cell has already been won on the public board
    const { board, row, col } = move.move;
    if (this.state.publiclyVisible[board][row][col]) {
      throw new InvalidParametersError(BOARD_POSITION_NOT_VALID_MESSAGE);
    }

    // check if the board has already been won
    if (this._games[board].state.status === 'OVER') {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // check if occupied by current player already
    if (this._games[board].getCell(row, col) === move.move.gamePiece) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    this._validateMove(move);

    const { board, row, col, gamePiece } = move.move;
    const subGame = this._games[board];

    const publiclyOccupied = subGame.getCell(row, col) !== '';

    this.state = {
      ...this.state,
      moves: [...this.state.moves, move.move],
    };

    if (publiclyOccupied) {
      const newPub = this.state.publiclyVisible[board].map(r => [...r]);
      newPub[row][col] = true;
      this.state = {
        ...this.state,
        publiclyVisible: {
          ...this.state.publiclyVisible,
          [board]: newPub,
        },
      };
    } else {
      subGame.applyMove(
        {
          gameID: move.gameID,
          playerID: move.playerID,
          move: { gamePiece, row, col },
        },
        false,
      );
    }

    this._moveCount += 1;

    this._checkForWins();
    this._checkForGameEnding();
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    // iterate through every board
    for (const board of ['A', 'B', 'C'] as const) {
      const game = this._games[board];

      if (!this._wonGame[board]) {
        // check if a winner is set on this board
        if (game.state.winner != null) {
          if (game.state.winner === this.state.x) {
            this._xScore++;
          } else if (game.state.winner === this.state.o) {
            this._oScore++;
          }

          game.state.status = 'OVER';
          this._wonGame[board] = true;
        }
      }
    }

    this.state = {
      ...this.state,
      xScore: this._xScore,
      oScore: this._oScore,
    };
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    let movesRemain = false;

    // check each board for being in win state, since base applyMove updates
    for (const b of ['A', 'B', 'C'] as const) {
      const sub = this._games[b];
      if (sub.state.status !== 'OVER') {
        movesRemain = true;
      }
      if (movesRemain) break;
    }

    if (!movesRemain) {
      let winnerID: string | undefined;
      if (this._xScore > this._oScore) winnerID = this.state.x;
      else if (this._oScore > this._xScore) winnerID = this.state.o;

      this.state = {
        ...this.state,
        status: 'OVER',
        winner: winnerID,
      };
    }
  }
}
