import { createPlayerForTesting } from '../../TestUtils';
import Player from '../../lib/Player';
import { GameMove, QuantumTicTacToeMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;
  let dummyPlayer: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
    dummyPlayer = createPlayerForTesting();
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    it('should add the second player as O', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
    it('should throw error if game is full', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(dummyPlayer)).toThrowError(GAME_FULL_MESSAGE);
    });
    it('should throw error is player 1 already in game', () => {
      game.join(player1);
      expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    it('should throw error is player 2 already in game', () => {
      game.join(player2);
      expect(() => game.join(player2)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });

    describe('When the player can be added', () => {
      it('makes the first player X and inits the state', () => {
        const player = createPlayerForTesting();
        game.join(player);
        expect(game.state.x).toBe(player.id);
        expect(game.state.o).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
      });
      describe('When the second player joins', () => {
        beforeEach(() => {
          game.join(player1);
          game.join(player2);
        });
        it('makes the second player O', () => {
          expect(game.state.x).toBe(player1.id);
          expect(game.state.o).toBe(player2.id);
        });
        it('sets the game status to IN_PROGRESS', () => {
          expect(game.state.status).toBe('IN_PROGRESS');
          expect(game.state.winner).toBeUndefined();
          expect(game.state.moves).toHaveLength(0);
        });
      });
    });
  });

  describe('_leave', () => {
    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });

      it('should set the game to OVER and declare O the winner', () => {
        game.leave(player1);

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });

      it('should set the game to OVER and declare X the winner', () => {
        game.leave(player2);

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.moves).toHaveLength(0);

        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBe(player2.id);
      });
    });
    describe('when one player is in the game', () => {
      beforeEach(() => {
        game.join(player1);
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
        expect(game.state.winner).toBeUndefined();
        expect(game.state.status).toBe('WAITING_TO_START');
      });

      it('should set the game to WAITING_TO_START', () => {
        expect(game.state.x).toBe(player1.id);
        expect(game.state.o).toBeUndefined();
        game.leave(player1);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
        expect(game.state.moves).toHaveLength(0);
      });
    });
  });

  describe('applyMove', () => {
    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    describe('when given an invalid move', () => {
      it('should throw an error if the game is not in progress', () => {
        game.join(player1);

        expect(() => {
          makeMove(player1, 'A', 0, 0);
        }).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      });
      describe('when the game is in progress', () => {
        beforeEach(() => {
          player1 = createPlayerForTesting();
          player2 = createPlayerForTesting();
          game.join(player1);
          game.join(player2);
          expect(game.state.status).toBe('IN_PROGRESS');
        });
        it('should rely on player ID to determine whose turn it is', () => {
          expect(() => {
            game.applyMove({
              gameID: game.id,
              playerID: player2.id,
              move: {
                board: 'A',
                row: 0,
                col: 0,
                gamePiece: 'X',
              },
            });
          }).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
          expect(() => {
            game.applyMove({
              gameID: game.id,
              playerID: player1.id,
              move: {
                board: 'A',
                row: 0,
                col: 0,
                gamePiece: 'X',
              },
            });
          }).not.toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        });
        it('should throw an error if the move is out of turn for the player ID', () => {
          expect(() =>
            game.applyMove({
              gameID: game.id,
              playerID: player2.id,
              move: {
                board: 'A',
                row: 0,
                col: 0,
                gamePiece: 'X',
              },
            }),
          ).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
          game.applyMove({
            gameID: game.id,
            playerID: player1.id,
            move: {
              board: 'A',
              row: 0,
              col: 0,
              gamePiece: 'X',
            },
          });
          expect(() =>
            game.applyMove({
              gameID: game.id,
              playerID: player1.id,
              move: {
                board: 'A',
                row: 0,
                col: 1,
                gamePiece: 'X',
              },
            }),
          ).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
          // TODO this is a tricky one - the weaker test suite doesn't check that the player 2's move is out of turn after their first move
          game.applyMove({
            gameID: game.id,
            playerID: player2.id,
            move: {
              board: 'A',
              row: 0,
              col: 2,
              gamePiece: 'O',
            },
          });
          expect(() =>
            game.applyMove({
              gameID: game.id,
              playerID: player2.id,
              move: {
                board: 'A',
                row: 2,
                col: 1,
                gamePiece: 'O',
              },
            }),
          ).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        });
        it('should skip turn when an hidden piece is revealed', () => {
          makeMove(player1, 'A', 1, 1);
          makeMove(player2, 'A', 1, 1);
          expect(game.state.moves).toHaveLength(2); // turn skipped, but move still logged
          makeMove(player1, 'A', 1, 2);
          expect(game.state.moves).toHaveLength(3);
        });
        it('should throw if cell is filled publicly', () => {
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'A', 0, 0); // O
          expect(() => {
            makeMove(player1, 'A', 0, 0); // X
          }).toThrowError(INVALID_MOVE_MESSAGE);
        });
        it('should throw if the board is already won', () => {
          makeMove(player1, 'A', 0, 0); // X
          makeMove(player2, 'A', 0, 1); // O
          makeMove(player1, 'A', 1, 0); // X
          makeMove(player2, 'A', 1, 1); // O
          makeMove(player1, 'A', 2, 0); // X
          expect(() => {
            makeMove(player2, 'A', 2, 1);
          }).toThrowError(INVALID_MOVE_MESSAGE);
        });
        it('should throw if player already sees piece', () => {
          expect(() => {
            makeMove(player1, 'A', 0, 0); // X
            makeMove(player2, 'A', 1, 1); // O
            makeMove(player1, 'A', 0, 0); // X
            makeMove(player2, 'A', 1, 1); // O
            makeMove(player1, 'A', 0, 0); // X
          }).toThrowError(INVALID_MOVE_MESSAGE);
        });
      });
    });

    describe('when given a valid move', () => {
      let numMoves = 0;
      let moves: QuantumTicTacToeMove[] = [];

      function makeMoveAndCheckState(
        player: Player,
        board: 'A' | 'B' | 'C',
        row: 0 | 1 | 2,
        col: 0 | 1 | 2,
      ) {
        const gamePiece = player.id === player1.id ? 'X' : 'O';

        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: {
            board,
            row,
            col,
            gamePiece,
          },
        });
        moves.push({ board, row, col, gamePiece });
        expect(game.state.moves).toHaveLength(++numMoves);
        for (let i = 0; i < numMoves; i++) {
          expect(game.state.moves[i]).toEqual(moves[i]);
        }
      }

      beforeEach(() => {
        player1 = createPlayerForTesting();
        player2 = createPlayerForTesting();
        game.join(player1);
        game.join(player2);
        numMoves = 0;
        moves = [];
        expect(game.state.status).toEqual('IN_PROGRESS');
      });

      it('should place a piece on an empty square', () => {
        makeMove(player1, 'A', 0, 0);
        // @ts-expect-error - private property
        expect(game._games.A._board[0][0]).toBe('X');
        expect(game.state.moves.length).toBe(1);
      });
      it('should add valid move to game state', () => {
        makeMoveAndCheckState(player1, 'A', 0, 0);
      });
      it('should add invalid move to game state', () => {
        makeMoveAndCheckState(player1, 'A', 0, 0);
        makeMoveAndCheckState(player2, 'A', 0, 0);
      });

      describe('scoring and game end', () => {
        it('should award a point when a player gets three-in-a-row', () => {
          // X gets a win on board A
          makeMoveAndCheckState(player1, 'A', 0, 0); // X
          makeMoveAndCheckState(player2, 'B', 0, 0); // O
          makeMoveAndCheckState(player1, 'A', 0, 1); // X
          makeMoveAndCheckState(player2, 'B', 0, 1); // O
          makeMoveAndCheckState(player1, 'A', 0, 2); // X -> scores 1 point

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(0);
        });
        it('should not win the game if the move does not end the game', () => {
          makeMoveAndCheckState(player1, 'A', 0, 0); // X
          makeMoveAndCheckState(player2, 'B', 0, 0); // O
          makeMoveAndCheckState(player1, 'A', 0, 1); // X
          makeMoveAndCheckState(player2, 'B', 0, 1); // O

          expect(game.state.xScore).toBe(0);
          expect(game.state.oScore).toBe(0);
          expect(game.state.winner).toBeUndefined();
        });
        it('should win the game when one player gets higher score', () => {
          // X gets a win on board A
          makeMoveAndCheckState(player1, 'A', 0, 0); // X
          makeMoveAndCheckState(player2, 'A', 0, 0); // O
          makeMoveAndCheckState(player1, 'A', 0, 1); // X
          makeMoveAndCheckState(player2, 'A', 0, 1); // O
          makeMoveAndCheckState(player1, 'A', 0, 2); // X -> scores 1 point

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(0);

          // O gets a win on board B
          makeMoveAndCheckState(player2, 'B', 0, 0); // O
          makeMoveAndCheckState(player1, 'B', 0, 0); // X
          makeMoveAndCheckState(player2, 'B', 0, 1); // O
          makeMoveAndCheckState(player1, 'B', 0, 1); // X
          makeMoveAndCheckState(player2, 'B', 0, 2); // O -> scores 1 point

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(1);

          // X gets a win on board C
          makeMoveAndCheckState(player1, 'C', 0, 0); // X
          makeMoveAndCheckState(player2, 'C', 0, 0); // O
          makeMoveAndCheckState(player1, 'C', 0, 1); // X
          makeMoveAndCheckState(player2, 'C', 0, 1); // O
          makeMoveAndCheckState(player1, 'C', 0, 2); // X -> scores 1 point

          expect(game.state.xScore).toBe(2);
          expect(game.state.oScore).toBe(1);
          expect(game.state.winner).toBe(player1.id);
        });
        it('should tie the game if both players have the same score', () => {
          // X gets a win on board A
          makeMoveAndCheckState(player1, 'A', 0, 0); // X
          makeMoveAndCheckState(player2, 'A', 0, 0); // O
          makeMoveAndCheckState(player1, 'A', 0, 1); // X
          makeMoveAndCheckState(player2, 'A', 0, 1); // O
          makeMoveAndCheckState(player1, 'A', 0, 2); // X -> scores 1 point

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(0);

          // O gets a win on board B
          makeMoveAndCheckState(player2, 'B', 0, 0); // O
          makeMoveAndCheckState(player1, 'B', 0, 0); // X
          makeMoveAndCheckState(player2, 'B', 0, 1); // O
          makeMoveAndCheckState(player1, 'B', 0, 1); // X
          makeMoveAndCheckState(player2, 'B', 0, 2); // O -> scores 1 point

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(1);

          // game ties on board C
          // X O X
          // X O X
          // O X O
          makeMoveAndCheckState(player1, 'C', 0, 0); // X
          makeMoveAndCheckState(player2, 'C', 0, 1); // O
          makeMoveAndCheckState(player1, 'C', 1, 0); // X
          makeMoveAndCheckState(player2, 'C', 1, 1); // O
          makeMoveAndCheckState(player1, 'C', 2, 1); // X
          makeMoveAndCheckState(player2, 'C', 2, 0); // O
          makeMoveAndCheckState(player1, 'C', 0, 2); // X
          makeMoveAndCheckState(player2, 'C', 2, 2); // O
          makeMoveAndCheckState(player1, 'C', 1, 2); // X

          expect(game.state.xScore).toBe(1);
          expect(game.state.oScore).toBe(1);
          expect(game.state.winner).toBeUndefined();
          expect(game.state.status).toEqual('OVER');
        });
        it('should tie the game if no playable squares', () => {
          // game ties on board A
          // X O X
          // X O X
          // O X O
          makeMoveAndCheckState(player1, 'A', 0, 0); // X
          makeMoveAndCheckState(player2, 'A', 0, 1); // O
          makeMoveAndCheckState(player1, 'A', 1, 0); // X
          makeMoveAndCheckState(player2, 'A', 1, 1); // O
          makeMoveAndCheckState(player1, 'A', 2, 1); // X
          makeMoveAndCheckState(player2, 'A', 2, 0); // O
          makeMoveAndCheckState(player1, 'A', 0, 2); // X
          makeMoveAndCheckState(player2, 'A', 2, 2); // O
          makeMoveAndCheckState(player1, 'A', 1, 2); // X
          expect(game.state.xScore).toBe(0);
          expect(game.state.oScore).toBe(0);

          // game ties on board B
          // O X O
          // O X O
          // X O X
          makeMoveAndCheckState(player2, 'B', 0, 0); // O
          makeMoveAndCheckState(player1, 'B', 0, 1); // X
          makeMoveAndCheckState(player2, 'B', 1, 0); // O
          makeMoveAndCheckState(player1, 'B', 1, 1); // X
          makeMoveAndCheckState(player2, 'B', 2, 1); // O
          makeMoveAndCheckState(player1, 'B', 2, 0); // X
          makeMoveAndCheckState(player2, 'B', 0, 2); // O
          makeMoveAndCheckState(player1, 'B', 2, 2); // X
          makeMoveAndCheckState(player2, 'B', 1, 2); // O
          expect(game.state.xScore).toBe(0);
          expect(game.state.oScore).toBe(0);

          // game ties on board C
          // X O X
          // X O X
          // O X O
          makeMoveAndCheckState(player1, 'C', 0, 0); // X
          makeMoveAndCheckState(player2, 'C', 0, 1); // O
          makeMoveAndCheckState(player1, 'C', 1, 0); // X
          makeMoveAndCheckState(player2, 'C', 1, 1); // O
          makeMoveAndCheckState(player1, 'C', 2, 1); // X
          makeMoveAndCheckState(player2, 'C', 2, 0); // O
          makeMoveAndCheckState(player1, 'C', 0, 2); // X
          makeMoveAndCheckState(player2, 'C', 2, 2); // O
          makeMoveAndCheckState(player1, 'C', 1, 2); // X

          expect(game.state.xScore).toBe(0);
          expect(game.state.oScore).toBe(0);
          expect(game.state.winner).toBeUndefined();
          expect(game.state.status).toEqual('OVER');
        });
      });
    });
  });
});
