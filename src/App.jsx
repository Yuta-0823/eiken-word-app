import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, GraduationCap, RotateCcw, CheckCircle2, XCircle, ChevronRight, Award, List, ArrowLeft, ArrowRight, Search, Plus, Trash2, X } from 'lucide-react';
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
    const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#42A5F5', '#66BB6A'];

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
        dr: Math.random() * 10 - 5
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};

// localStorage 安全読み出しヘルパー
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export default function App() {
  const [mode, setMode] = useState('home'); // home, quiz, practice, result
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  // 学習データ（localStorageに永続化）
  const [wrongWords, setWrongWords] = useState(() => loadFromStorage('eiken_wrongWords', []));
  const [learnedStatus, setLearnedStatus] = useState(() => loadFromStorage('eiken_learnedStatus', {})); // { [id]: 'correct' | 'wrong' }
  const [customWords, setCustomWords] = useState(() => loadFromStorage('eiken_customWords', [])); // ユーザー追加単語
  const [isHintMode, setIsHintMode] = useState(false);

  // 全単語（標準1500 + ユーザー追加）
  const allWords = useMemo(() => [...wordDatabase, ...customWords], [customWords]);

  // クイズ画面のステート
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [options, setOptions] = useState([]);

  // 永続化: 値が変わるたびにlocalStorageへ保存
  useEffect(() => {
    try { localStorage.setItem('eiken_wrongWords', JSON.stringify(wrongWords)); } catch {}
  }, [wrongWords]);

  useEffect(() => {
    try { localStorage.setItem('eiken_learnedStatus', JSON.stringify(learnedStatus)); } catch {}
  }, [learnedStatus]);

  useEffect(() => {
    try { localStorage.setItem('eiken_customWords', JSON.stringify(customWords)); } catch {}
  }, [customWords]);

  // 初期化・モード切替
  const startQuiz = (sourceList, isReview = false, hintMode = false) => {
    setIsHintMode(hintMode);
    // 類推しやすくするため、元の配列の順序（カテゴリ順）をなるべく維持しつつ、開始位置をランダムにする
    let selectedWords = [];
    if (isReview) {
      selectedWords = sourceList.slice(0, 10); // 復習は最大10問
    } else {
      const startIndex = Math.floor(Math.random() * Math.max(1, sourceList.length - 10));
      selectedWords = sourceList.slice(startIndex, startIndex + 10);
      // 足りない場合は最初から補填
      if (selectedWords.length < 10) {
        selectedWords = [...selectedWords, ...sourceList.slice(0, 10 - selectedWords.length)];
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
    const wrongOptions = allWords
      .filter(w => w.id !== correctWord.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const allOptions = [...wrongOptions, correctWord].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  // 解答クリック時
  const handleAnswerClick = (option) => {
    if (selectedAnswer) return; // 既に解答済みの場合は無視

    const currentWord = quizQuestions[currentQIndex];
    const isCorrect = option.id === currentWord.id;
    setSelectedAnswer(option);

    if (isCorrect) {
      setScore(s => s + 1);
      // 学習済みに記録
      setLearnedStatus(prev => ({ ...prev, [currentWord.id]: 'correct' }));
      // 復習リストにあれば削除（再度正解できたので卒業）
      setWrongWords(prev => prev.filter(w => w.id !== currentWord.id));
    } else {
      // 間違えたリストに追加（重複チェック）
      if (!wrongWords.some(w => w.id === currentWord.id)) {
        setWrongWords(prev => [...prev, currentWord]);
      }
      setLearnedStatus(prev => ({ ...prev, [currentWord.id]: 'wrong' }));
    }

    // すぐにフリップして解説を見せる
    setTimeout(() => {
      setIsFlipped(true);
    }, 500);
  };

  // クイズ中にホームへ戻る（確認あり）
  const handleQuitQuiz = () => {
    if (window.confirm('テストを中断してホームに戻りますか？\n（解答済みの記録は保持されます）')) {
      setMode('home');
      setIsFlipped(false);
      setSelectedAnswer(null);
    }
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

  const Home = () => {
    const learnedCount = Object.values(learnedStatus).filter(s => s === 'correct').length;
    const totalCount = allWords.length;
    const progressPct = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;
    return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4 tracking-tight">
          CoreWord <span className="text-blue-600">Master</span>
        </h1>
        <p className="text-gray-600 font-medium">英検2級 - 語源とコアイメージで本質から理解する</p>
      </div>

      {/* 学習統計 */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-gray-600">学習進捗</span>
          <span className="text-sm font-bold text-blue-600">{learnedCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }}></div>
        </div>
        <div className="flex justify-around text-xs font-bold pt-1">
          <div className="text-center">
            <div className="text-green-600 text-lg">{learnedCount}</div>
            <div className="text-gray-500">✓ 正解済</div>
          </div>
          <div className="text-center">
            <div className="text-red-500 text-lg">{wrongWords.length}</div>
            <div className="text-gray-500">✗ 復習中</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-lg">{totalCount - learnedCount - wrongWords.length}</div>
            <div className="text-gray-500">未学習</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => startQuiz(allWords)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg">通常テスト (10問)</span>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => startQuiz(allWords, false, true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6" />
            <div className="text-left">
              <div className="text-lg">ヒントありテスト (10問)</div>
              <div className="text-xs opacity-80 font-normal">コアイメージ・語源から推測</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => wrongWords.length > 0 ? startQuiz(wrongWords, true) : alert('間違えた単語はまだありません。')}
          className={`w-full font-bold py-4 px-6 rounded-2xl shadow-md transform transition flex items-center justify-between group
            ${wrongWords.length > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-6 h-6" />
            <span className="text-lg">復習テスト ({wrongWords.length}問)</span>
          </div>
          <ChevronRight className={`w-5 h-5 opacity-70 ${wrongWords.length > 0 ? 'group-hover:opacity-100 group-hover:translate-x-1' : ''} transition-all`} />
        </button>

        <button
          onClick={() => setMode('practice')}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center space-x-3">
            <BookOpen className="w-6 h-6" />
            <div className="text-left">
              <div className="text-lg">単語辞書 ({totalCount}語)</div>
              <div className="text-xs opacity-80 font-normal">検索・索引・単語追加</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
    );
  };

  const Quiz = () => {
    const currentWord = quizQuestions[currentQIndex];
    const isCorrect = selectedAnswer?.id === currentWord.id;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-[80vh]">
        {/* ホームに戻るボタン */}
        <div className="mb-3">
          <button
            onClick={handleQuitQuiz}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            ホームに戻る
          </button>
        </div>

        {/* プログレスバー */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
            <span>Question {currentQIndex + 1} of {quizQuestions.length}</span>
            <span>Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentQIndex + 1) / quizQuestions.length) * 100}%` }}></div>
          </div>
        </div>

        {/* フリップカード */}
        <div className="relative w-full h-72 md:h-80 mb-8" style={{ perspective: '1000px' }}>
          <div 
            className="w-full h-full relative transition-transform duration-700" 
            style={{ 
              transformStyle: 'preserve-3d', 
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
            }}
          >
            {/* 表面（問題） */}
            <div
              className={`absolute w-full h-full rounded-3xl shadow-xl flex flex-col border-4 overflow-y-auto ${
                isHintMode
                  ? 'bg-purple-50 border-purple-100 p-5 justify-start'
                  : 'bg-white border-gray-50 items-center justify-center'
              }`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              {isHintMode ? (
                <>
                  <div className="text-center mb-3">
                    <span className="text-xs font-bold text-purple-500 tracking-widest uppercase">{currentWord.category}</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight mt-1">{currentWord.word}</h2>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-2 border border-purple-100">
                    <p className="text-xs font-bold text-purple-600 mb-1 flex items-center"><Award className="w-3 h-3 mr-1"/>コアイメージ</p>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">{currentWord.coreImage}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-purple-100">
                    <p className="text-xs font-bold text-purple-600 mb-1">【語源】</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{currentWord.etymology}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-blue-400 mb-4 tracking-widest uppercase">{currentWord.category}</span>
                  <h2 className="text-5xl md:text-6xl font-extrabold text-gray-800 tracking-tight">{currentWord.word}</h2>
                </>
              )}
            </div>

            {/* 裏面（解説） */}
            <div 
              className="absolute w-full h-full bg-blue-50 rounded-3xl shadow-xl p-6 flex flex-col justify-center border-4 border-blue-100 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="text-center mb-4">
                <h2 className="text-3xl font-extrabold text-blue-900">{currentWord.word}</h2>
                <p className="text-xl font-bold text-gray-700 mt-1">{currentWord.translation}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-blue-100">
                <p className="text-sm font-bold text-blue-600 mb-1 flex items-center"><Award className="w-4 h-4 mr-1"/>コアイメージ</p>
                <p className="text-gray-800 font-medium leading-relaxed">{currentWord.coreImage}</p>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-semibold text-gray-700">【語源】</span> {currentWord.etymology}</p>
                <p><span className="font-semibold text-gray-700">【例文】</span> <br className="md:hidden"/>{currentWord.example}</p>
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
                    ${selectedAnswer === opt 
                      ? (opt.id === currentWord.id ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
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
                    <span className="text-2xl font-bold text-green-500">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <span className="text-2xl font-bold text-red-500">Incorrect</span>
                  </>
                )}
              </div>
              <button
                onClick={handleNextQuestion}
                className="w-full md:w-auto md:px-12 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transform transition active:scale-95 flex justify-center items-center"
              >
                <span>{currentQIndex + 1 < quizQuestions.length ? '次の問題へ' : '結果を見る'}</span>
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
            {score} <span className="text-3xl text-gray-400">/ {quizQuestions.length}</span>
          </div>

          {isPerfect ? (
            <div className="mb-8 animate-bounce">
              <p className="text-2xl font-bold text-green-500 flex items-center justify-center">
                <Award className="w-8 h-8 mr-2" />
                Perfect! Brilliant!
              </p>
              <p className="text-gray-600 mt-2">コアイメージを完全に掴んでいますね！</p>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-lg font-bold text-gray-700 mb-2">お疲れ様でした！</p>
              <p className="text-gray-600 text-sm">間違えた問題は自動的にリストに追加されました。<br/>反復してコアイメージを定着させましょう。</p>
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLetter, setSelectedLetter] = useState('All');
    const [expandedId, setExpandedId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newWord, setNewWord] = useState({ word: '', translation: '', coreImage: '', etymology: '', example: '', category: 'カスタム' });

    const letters = ['All', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    const filtered = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      return allWords.filter(w => {
        const matchSearch = !q ||
          w.word.toLowerCase().includes(q) ||
          (w.translation || '').toLowerCase().includes(q);
        let matchLetter = true;
        if (selectedLetter !== 'All') {
          const firstChar = (w.word || '').charAt(0).toUpperCase();
          if (selectedLetter === '#') {
            matchLetter = !/[A-Z]/.test(firstChar);
          } else {
            matchLetter = firstChar === selectedLetter;
          }
        }
        return matchSearch && matchLetter;
      }).sort((a, b) => a.word.localeCompare(b.word));
    }, [searchQuery, selectedLetter]);

    const handleAddWord = () => {
      if (!newWord.word.trim() || !newWord.translation.trim()) {
        alert('単語と日本語訳は必須です');
        return;
      }
      const maxId = allWords.reduce((m, w) => Math.max(m, w.id || 0), 0);
      const entry = {
        id: maxId + 1,
        word: newWord.word.trim(),
        translation: newWord.translation.trim(),
        coreImage: newWord.coreImage.trim() || '（コアイメージ未登録）',
        etymology: newWord.etymology.trim() || '（語源未登録）',
        example: newWord.example.trim() || '',
        category: 'カスタム',
        isCustom: true,
      };
      setCustomWords(prev => [...prev, entry]);
      setNewWord({ word: '', translation: '', coreImage: '', etymology: '', example: '', category: 'カスタム' });
      setShowAddForm(false);
    };

    const handleDeleteCustom = (id) => {
      if (window.confirm('この単語を削除しますか？')) {
        setCustomWords(prev => prev.filter(w => w.id !== id));
      }
    };

    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMode('home')} className="flex items-center text-blue-600 font-bold hover:text-blue-800">
            <ArrowLeft className="w-5 h-5 mr-1" /> 戻る
          </button>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-teal-500" />
            単語辞書
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-3 rounded-lg shadow-sm text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> 追加
          </button>
        </div>

        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="英単語または日本語で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-400 focus:outline-none text-base"
          />
        </div>

        {/* A-Z 索引 */}
        <div className="flex overflow-x-auto pb-3 mb-3 gap-1 hide-scrollbar">
          {letters.map(letter => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={`shrink-0 w-9 h-9 rounded-lg font-bold text-sm transition ${
                selectedLetter === letter ? 'bg-teal-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-gray-500 mb-3">
          {filtered.length} 件 / 全{allWords.length}語
        </div>

        {/* コンパクトな単語リスト */}
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">該当する単語が見つかりません</div>
          ) : filtered.map(word => {
            const status = learnedStatus[word.id];
            const expanded = expandedId === word.id;
            return (
              <div
                key={word.id}
                className={`bg-white rounded-xl shadow-sm border-l-4 transition ${
                  status === 'correct' ? 'border-green-400' : status === 'wrong' ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : word.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {status === 'correct' && <span className="text-green-500 shrink-0">✓</span>}
                    {status === 'wrong' && <span className="text-red-500 shrink-0">✗</span>}
                    {!status && <span className="text-gray-300 shrink-0">○</span>}
                    <span className="font-bold text-gray-800 text-base">{word.word}</span>
                    {word.isCustom && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">追加</span>}
                    <span className="text-gray-600 text-sm truncate">{word.translation}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                {expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                    <div className="text-xs font-bold text-teal-500 uppercase tracking-wider mb-2 mt-2">{word.category}</div>
                    <div className="bg-white p-3 rounded-lg mb-2 border border-teal-100">
                      <p className="text-xs font-bold text-teal-600 mb-1 flex items-center">
                        <Award className="w-3 h-3 mr-1" /> コアイメージ
                      </p>
                      <p className="text-sm text-gray-800">{word.coreImage}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-bold text-gray-700">【語源】</span> <span className="text-gray-600">{word.etymology}</span></p>
                      {word.example && <p><span className="font-bold text-gray-700">【例文】</span> <span className="text-gray-600">{word.example}</span></p>}
                    </div>
                    {word.isCustom && (
                      <button
                        onClick={() => handleDeleteCustom(word.id)}
                        className="mt-3 flex items-center text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> この単語を削除
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 単語追加モーダル */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                <h3 className="text-lg font-extrabold text-gray-800">単語を追加</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">英単語 <span className="text-red-500">*</span></label>
                  <input type="text" value={newWord.word} onChange={(e) => setNewWord({...newWord, word: e.target.value})} placeholder="例: serendipity" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">日本語訳 <span className="text-red-500">*</span></label>
                  <input type="text" value={newWord.translation} onChange={(e) => setNewWord({...newWord, translation: e.target.value})} placeholder="例: 偶然の幸運な発見" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">コアイメージ</label>
                  <textarea value={newWord.coreImage} onChange={(e) => setNewWord({...newWord, coreImage: e.target.value})} placeholder="例: 思いがけず良いものを見つける感覚" rows={2} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">語源</label>
                  <input type="text" value={newWord.etymology} onChange={(e) => setNewWord({...newWord, etymology: e.target.value})} placeholder="例: スリランカの古名Serendipに由来" className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">例文</label>
                  <input type="text" value={newWord.example} onChange={(e) => setNewWord({...newWord, example: e.target.value})} placeholder="例: A serendipity led to the discovery." className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50">キャンセル</button>
                  <button onClick={handleAddWord} className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 font-bold text-white shadow-md">追加する</button>
                </div>
                <p className="text-xs text-gray-500 text-center">追加した単語はテストにも自動で出題されます</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-extrabold text-xl tracking-tight text-blue-900 flex items-center cursor-pointer" onClick={() => setMode('home')}>
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
      <style dangerouslySetInnerHTML={{__html: `
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
      `}} />
    </div>
  );
}