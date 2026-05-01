import React, { useState, useEffect, useRef } from 'react';
// アイコンを文字で代用するシンプルなコンポーネント群
const BookOpen = ({ className }) => <span className={className}>📖</span>;
const GraduationCap = ({ className }) => <span className={className}>🎓</span>;
const RotateCcw = ({ className }) => <span className={className}>🔄</span>;
const CheckCircle2 = ({ className }) => <span className={className}>✅</span>;
const XCircle = ({ className }) => <span className={className}>❌</span>;
const ChevronRight = ({ className }) => <span className={className}>›</span>;
const Award = ({ className }) => <span className={className}>🏆</span>;
const List = ({ className }) => <span className={className}>≡</span>;
const ArrowLeft = ({ className }) => <span className={className}>←</span>;
const ArrowRight = ({ className }) => <span className={className}>→</span>;
import { wordDatabase } from './wordData';

// --- 紙吹雪コンポーネント ---
const Confetti = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = [
      '#fce18a',
      '#ff726d',
      '#b48def',
      '#f4306d',
      '#42A5F5',
      '#66BB6A',
    ];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 10 + 5,
        c: colors[Math.floor(Math.random() * colors.length)],
        dx: Math.random() * 4 - 2,
        dy: Math.random() * 3 + 2,
        r: Math.random() * 360,
        dr: Math.random() * 10 - 5,
      });
    }

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.dy;
        p.x += p.dx;
        p.r += p.dr;

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.r * Math.PI) / 180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
};

export default function App() {
  const [mode, setMode] = useState('home'); // home, quiz, practice, result
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongWords, setWrongWords] = useState([]); // { wordObj, mistaken: boolean } のリスト

  // クイズ画面のステート
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [options, setOptions] = useState([]);

  // 初期化・モード切替
  const startQuiz = (sourceList, isReview = false) => {
    // 類推しやすくするため、元の配列の順序（カテゴリ順）をなるべく維持しつつ、開始位置をランダムにする
    let selectedWords = [];
    if (isReview) {
      selectedWords = sourceList.slice(0, 10); // 復習は最大10問
    } else {
      const startIndex = Math.floor(
        Math.random() * Math.max(1, sourceList.length - 10)
      );
      selectedWords = sourceList.slice(startIndex, startIndex + 10);
      // 足りない場合は最初から補填
      if (selectedWords.length < 10) {
        selectedWords = [
          ...selectedWords,
          ...sourceList.slice(0, 10 - selectedWords.length),
        ];
      }
    }

    setQuizQuestions(selectedWords);
    setCurrentQIndex(0);
    setScore(0);
    setMode('quiz');
    generateOptions(selectedWords[0]);
    setIsFlipped(false);
    setSelectedAnswer(null);
  };

  // 選択肢の生成
  const generateOptions = (correctWord) => {
    const wrongOptions = wordDatabase
      .filter((w) => w.id !== correctWord.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const allOptions = [...wrongOptions, correctWord].sort(
      () => 0.5 - Math.random()
    );
    setOptions(allOptions);
  };

  // 解答クリック時
  const handleAnswerClick = (option) => {
    if (selectedAnswer) return; // 既に解答済みの場合は無視

    const isCorrect = option.id === quizQuestions[currentQIndex].id;
    setSelectedAnswer(option);

    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      // 間違えたリストに追加（重複チェック）
      const currentWord = quizQuestions[currentQIndex];
      if (!wrongWords.some((w) => w.id === currentWord.id)) {
        setWrongWords((prev) => [...prev, currentWord]);
      }
    }

    // すぐにフリップして解説を見せる
    setTimeout(() => {
      setIsFlipped(true);
    }, 500);
  };

  // 次の問題へ
  const handleNextQuestion = () => {
    if (currentQIndex + 1 < quizQuestions.length) {
      const nextWord = quizQuestions[currentQIndex + 1];
      setCurrentQIndex(currentQIndex + 1);
      generateOptions(nextWord);
      setIsFlipped(false);
      setSelectedAnswer(null);
    } else {
      setMode('result');
    }
  };

  // --- 画面コンポーネント ---

  const Home = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4 tracking-tight">
          CoreWord <span className="text-blue-600">Master</span>
        </h1>
        <p className="text-gray-600 font-medium">
          英検2級 - 語源とコアイメージで本質から理解する
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => startQuiz(wordDatabase)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg">通常テスト (10問)</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() =>
            wrongWords.length > 0
              ? startQuiz(wrongWords, true)
              : alert('間違えた単語はまだありません。')
          }
          className={`w-full font-bold py-4 px-6 rounded-2xl shadow-md transform transition flex items-center justify-between group
            ${
              wrongWords.length > 0
                ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-6 h-6" />
            <span className="text-lg">復習テスト ({wrongWords.length}問)</span>
          </div>
          <ChevronRight
            className={`w-5 h-5 opacity-70 ${
              wrongWords.length > 0
                ? 'group-hover:opacity-100 group-hover:translate-x-1'
                : ''
            } transition-all`}
          />
        </button>

        <button
          onClick={() => setMode('practice')}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6" />
            <span className="text-lg">練習モード（一覧学習）</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );

  const Quiz = () => {
    const currentWord = quizQuestions[currentQIndex];
    const isCorrect = selectedAnswer?.id === currentWord.id;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-[80vh]">
        {/* プログレスバー */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
            <span>
              Question {currentQIndex + 1} of {quizQuestions.length}
            </span>
            <span>Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${((currentQIndex + 1) / quizQuestions.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* フリップカード */}
        <div
          className="relative w-full h-72 md:h-80 mb-8"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-full h-full relative transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* 表面（問題） */}
            <div
              className="absolute w-full h-full bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center border-4 border-gray-50"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-sm font-bold text-blue-400 mb-4 tracking-widest uppercase">
                {currentWord.category}
              </span>
              <h2 className="text-5xl md:text-6xl font-extrabold text-gray-800 tracking-tight">
                {currentWord.word}
              </h2>
            </div>

            {/* 裏面（解説） */}
            <div
              className="absolute w-full h-full bg-blue-50 rounded-3xl shadow-xl p-6 flex flex-col justify-center border-4 border-blue-100 overflow-y-auto"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-center mb-4">
                <h2 className="text-3xl font-extrabold text-blue-900">
                  {currentWord.word}
                </h2>
                <p className="text-xl font-bold text-gray-700 mt-1">
                  {currentWord.translation}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-blue-100">
                <p className="text-sm font-bold text-blue-600 mb-1 flex items-center">
                  <Award className="w-4 h-4 mr-1" />
                  コアイメージ
                </p>
                <p className="text-gray-800 font-medium leading-relaxed">
                  {currentWord.coreImage}
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-700">【語源】</span>{' '}
                  {currentWord.etymology}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">【例文】</span>{' '}
                  <br className="md:hidden" />
                  {currentWord.example}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 選択肢 or 次へボタン */}
        <div className="flex-grow flex flex-col justify-end">
          {!isFlipped ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswerClick(opt)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-xl font-bold text-lg text-left transition-all shadow-md
                    ${
                      selectedAnswer === opt
                        ? opt.id === currentWord.id
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 border-2 border-transparent hover:border-blue-200'
                    }`}
                >
                  {opt.translation}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center animate-fade-in-up">
              <div className="flex items-center space-x-2 mb-6">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <span className="text-2xl font-bold text-green-500">
                      Correct!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <span className="text-2xl font-bold text-red-500">
                      Incorrect
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={handleNextQuestion}
                className="w-full md:w-auto md:px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex justify-center items-center"
              >
                <span>
                  {currentQIndex + 1 < quizQuestions.length
                    ? '次の問題へ'
                    : '結果を見る'}
                </span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Result = () => {
    const isPerfect = score === quizQuestions.length;

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
        {isPerfect && <Confetti />}

        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Result</h2>
          <div className="text-6xl font-black text-blue-600 mb-6 drop-shadow-sm">
            {score}{' '}
            <span className="text-3xl text-gray-400">
              / {quizQuestions.length}
            </span>
          </div>

          {isPerfect ? (
            <div className="mb-8 animate-bounce">
              <p className="text-2xl font-bold text-green-500 flex items-center justify-center">
                <Award className="w-8 h-8 mr-2" />
                Perfect! Brilliant!
              </p>
              <p className="text-gray-600 mt-2">
                コアイメージを完全に掴んでいますね！
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-lg font-bold text-gray-700 mb-2">
                お疲れ様でした！
              </p>
              <p className="text-gray-600 text-sm">
                間違えた問題は自動的にリストに追加されました。
                <br />
                反復してコアイメージを定着させましょう。
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setMode('home')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 px-6 rounded-xl transition flex justify-center items-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              ホームに戻る
            </button>
            {wrongWords.length > 0 && !isPerfect && (
              <button
                onClick={() => startQuiz(wrongWords, true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-xl transition shadow-md flex justify-center items-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                間違えた問題を復習する
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PracticeMode = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = ['All', ...new Set(wordDatabase.map((w) => w.category))];
    const displayWords =
      selectedCategory === 'All'
        ? wordDatabase
        : wordDatabase.filter((w) => w.category === selectedCategory);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setMode('home')}
            className="flex items-center text-blue-600 font-bold hover:text-blue-800"
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> 戻る
          </button>
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-teal-500" />
            練習モード
          </h2>
        </div>

        {/* カテゴリフィルター */}
        <div className="flex overflow-x-auto pb-4 mb-6 space-x-2 snap-x hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`snap-center shrink-0 px-4 py-2 rounded-full font-bold text-sm transition ${
                selectedCategory === cat
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 単語リスト */}
        <div className="space-y-6">
          {displayWords.map((word) => (
            <div
              key={word.id}
              className="bg-white rounded-2xl shadow-md p-6 border-l-8 border-teal-400 flex flex-col md:flex-row gap-6"
            >
              <div className="md:w-1/3 flex flex-col justify-center">
                <span className="text-xs font-bold text-teal-500 uppercase tracking-wider mb-1">
                  {word.category}
                </span>
                <h3 className="text-3xl font-extrabold text-gray-800">
                  {word.word}
                </h3>
                <p className="text-lg font-bold text-gray-600 mt-1">
                  {word.translation}
                </p>
              </div>
              <div className="md:w-2/3 space-y-3 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-teal-600 mb-1 flex items-center">
                    <List className="w-4 h-4 mr-1" /> コアイメージ
                  </p>
                  <p className="font-medium text-gray-800">{word.coreImage}</p>
                </div>
                <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                  <p className="mb-1">
                    <span className="font-semibold text-gray-700">
                      【語源】
                    </span>{' '}
                    {word.etymology}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">
                      【例文】
                    </span>{' '}
                    {word.example}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="font-extrabold text-xl tracking-tight text-blue-900 flex items-center cursor-pointer"
            onClick={() => setMode('home')}
          >
            <GraduationCap className="w-6 h-6 mr-2 text-blue-600" />
            CoreWord Master
          </div>
          <div className="text-sm font-bold text-gray-400">英検2級</div>
        </div>
      </header>

      <main>
        {mode === 'home' && <Home />}
        {mode === 'quiz' && <Quiz />}
        {mode === 'result' && <Result />}
        {mode === 'practice' && <PracticeMode />}
      </main>

      {/* Tailwind Utility Classes for Custom Animations generated dynamically */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `,
        }}
      />
    </div>
  );
}
