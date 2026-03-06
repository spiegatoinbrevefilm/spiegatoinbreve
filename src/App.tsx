import React, { useState, useEffect } from 'react';
import { Search, Film, Star, Play, Info, ChevronRight, Menu, X, TrendingUp, Heart, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { cn, Movie } from './utils';
import { supabase } from './supabase';

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your environment variables.');
  }
  return new GoogleGenAI({ apiKey });
};

const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Dune: Part Two',
    year: '2024',
    rating: '8.8',
    image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1000',
    description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson']
  },
  {
    id: '2',
    title: 'Oppenheimer',
    year: '2023',
    rating: '8.4',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1000',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon']
  },
  {
    id: '3',
    title: 'Poor Things',
    year: '2023',
    rating: '8.0',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000',
    description: 'The incredible tale and fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.',
    director: 'Yorgos Lanthimos',
    cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe']
  },
  {
    id: '4',
    title: 'Interstellar',
    year: '2014',
    rating: '8.7',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000',
    description: 'When Earth becomes uninhabitable, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain']
  }
];

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [urlToFetch, setUrlToFetch] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'url' | 'admin'>('search');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Form state for admin
  const [newMovie, setNewMovie] = useState<any>({
    title: '',
    year: '',
    rating: '',
    image: '',
    description: '',
    director: '',
    cast: [],
    video_url: '',
    genre: '',
    is_featured: false
  });

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map data if necessary (e.g. cast is stored as JSON or array)
      setMovies(data || []);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    }
  };

  const heroMovies = movies.filter(m => m.is_featured).length > 0 
    ? movies.filter(m => m.is_featured) 
    : (movies.length > 0 ? [movies[0]] : MOCK_MOVIES.slice(0, 1));

  useEffect(() => {
    if (heroMovies.length <= 1) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroMovies.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroMovies.length, currentIndex]);

  const handleSaveMovie = async (eOrMovie?: React.FormEvent | Movie) => {
    if (eOrMovie && 'preventDefault' in eOrMovie) {
      eOrMovie.preventDefault();
    }
    
    const isDirectUpdate = eOrMovie && !('preventDefault' in eOrMovie);
    const movieToSave = isDirectUpdate ? (eOrMovie as Movie) : {
      ...newMovie,
      cast: typeof newMovie.cast === 'string' ? (newMovie.cast as string).split(',').map(s => s.trim()) : newMovie.cast
    };

    // Remove id if it's a new movie and we want Supabase to generate it (UUID)
    const { id, ...dataToSave } = movieToSave;
    const isUpdating = isEditing || isDirectUpdate;

    try {
      let result;
      if (isUpdating) {
        result = await supabase
          .from('movies')
          .update(dataToSave)
          .eq('id', id);
      } else {
        result = await supabase
          .from('movies')
          .insert([dataToSave]);
      }

      if (result.error) throw result.error;

      if (!isDirectUpdate) {
        setNewMovie({ title: '', year: '', rating: '', image: '', description: '', director: '', cast: [], video_url: '', genre: '', is_featured: false });
        setIsEditing(false);
        setEditingId(null);
      }
      fetchMovies();
      if (!isDirectUpdate) {
        alert(isEditing ? 'Movie updated successfully!' : 'Movie added successfully!');
      }
    } catch (err: any) {
      console.error('Failed to save movie:', err);
      alert(`Error: ${err.message || 'Failed to save movie'}`);
    }
  };

  const handleEditMovie = (movie: Movie) => {
    setNewMovie({
      ...movie,
      cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast
    });
    setIsEditing(true);
    setEditingId(movie.id);
    setActiveTab('admin');
  };

  const handleDeleteMovie = async (id: string) => {
    console.log("CLIENT: Delete requested for ID:", id);
    if (!id) {
      console.error("CLIENT: No ID provided for deletion");
      return;
    }
    
    const confirmed = window.confirm('Are you sure you want to delete this movie?');
    if (!confirmed) return;

    // Optimistic update
    const previousMovies = [...movies];
    setMovies(prev => prev.filter(m => m.id !== id));
    
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log("CLIENT: Delete success for ID:", id);
      fetchMovies();
    } catch (err: any) {
      console.error('CLIENT: Delete error:', err);
      alert(`Error: ${err.message || 'Failed to delete movie'}`);
      // Rollback
      setMovies(previousMovies);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = activeTab === 'search' ? searchQuery : urlToFetch;
    if (!query.trim()) return;

    setIsSearching(true);
    setAiResponse(null);
    
    try {
      console.log("CLIENT: Starting AI search/import with query:", query);
      console.log("CLIENT: Using model: gemini-3-flash-preview");
      
      const prompt = activeTab === 'url' 
        ? `Extract movie details from this URL: ${query}. 
           CRITICAL: You must return ONLY a raw JSON object. DO NOT use markdown code blocks (no \`\`\`json). DO NOT include any introductory or concluding text. Just the raw JSON string.
           Fields: title, year, rating, image, description, director, cast (array of strings), video_url, genre.
           is_featured should be false.
           If a field is missing, use an empty string.`
        : `Search for the movie "${query}" on portals like MyMovies.it, IMDb, and ComingSoon.it. Provide a comprehensive summary, the current rating consensus, and why it's recommended.`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: activeTab === 'url' ? [{ urlContext: {} }] : [{ googleSearch: {} }],
          responseMimeType: activeTab === 'url' ? "application/json" : "text/plain"
        }
      });
      
      console.log("CLIENT: AI Response received:", response);
      const responseText = response.text;
      console.log("CLIENT: Raw AI Response Text:", responseText);
      
      if (activeTab === 'url') {
        try {
          if (!responseText) throw new Error("Empty response from AI");
          
          // Clean the response text from potential markdown code blocks
          const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
          console.log("CLIENT: Cleaned JSON text for parsing:", cleanedText);
          const movieData = JSON.parse(cleanedText);
          
          setNewMovie({
            ...movieData,
            cast: Array.isArray(movieData.cast) ? movieData.cast.join(', ') : (movieData.cast || '')
          });
          setActiveTab('admin');
          setIsEditing(false);
          setEditingId(null);
          setAiResponse(null);
          alert('Data imported! Review and save in the Back Office.');
        } catch (pErr) {
          console.error('CLIENT: Parse error:', pErr);
          setAiResponse(responseText || 'Could not parse structured data.');
          alert('Could not parse structured data, showing summary instead.');
        }
      } else {
        setAiResponse(responseText || 'No results found.');
        const filtered = MOCK_MOVIES.filter(m => 
          m.title.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error: any) {
      console.error('CLIENT: Search error details:', error);
      setAiResponse(`Error: ${error.message || 'Failed to fetch results'}. Please check your API key.`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-display italic font-bold tracking-tighter text-white cursor-pointer" onClick={() => {setSearchQuery(''); setAiResponse(null);}}>
            CINE<span className="text-red-600">MODERN</span>
          </h1>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
            <button onClick={() => setActiveTab('search')} className={cn("hover:text-white transition-colors", activeTab === 'search' && "text-white")}>Search</button>
            <button onClick={() => setActiveTab('url')} className={cn("hover:text-white transition-colors", activeTab === 'url' && "text-white")}>Import from Link</button>
            <button onClick={() => setActiveTab('admin')} className={cn("hover:text-white transition-colors", activeTab === 'admin' && "text-white")}>Back Office</button>
            <a href="#" className="hover:text-white transition-colors">News</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder={activeTab === 'search' ? "Search movies, actors..." : "Paste IMDb/MyMovies link..."}
              value={activeTab === 'search' ? searchQuery : urlToFetch}
              onChange={(e) => activeTab === 'search' ? setSearchQuery(e.target.value) : setUrlToFetch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:w-80 focus:bg-white/10 focus:outline-none transition-all duration-300"
            />
          </form>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors md:hidden"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-2xl font-display">
              <a href="#" className="hover:text-red-500">Movies</a>
              <a href="#" className="hover:text-red-500">TV Shows</a>
              <a href="#" className="hover:text-red-500">Reviews</a>
              <a href="#" className="hover:text-red-500">News</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20">
        {/* Admin Panel */}
        {activeTab === 'admin' && (
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-display font-bold">Back Office</h2>
              <div className="flex gap-2">
                <span className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Database Connected</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Add Movie Form */}
              <div className="lg:col-span-1">
                <div className="glass p-8 rounded-3xl border border-white/10 sticky top-32">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Film className="text-red-500" size={20} /> {isEditing ? 'Edit Movie' : 'Add New Movie'}
                  </h3>
                  <form onSubmit={handleSaveMovie} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Movie Title"
                      value={newMovie.title}
                      onChange={e => setNewMovie({...newMovie, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50"
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Year"
                        value={newMovie.year}
                        onChange={e => setNewMovie({...newMovie, year: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Rating (e.g. 8.5)"
                        value={newMovie.rating}
                        onChange={e => setNewMovie({...newMovie, rating: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={newMovie.image}
                      onChange={e => setNewMovie({...newMovie, image: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                    <textarea
                      placeholder="Plot Summary"
                      value={newMovie.description}
                      onChange={e => setNewMovie({...newMovie, description: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none h-32 resize-none"
                    />
                    <input
                      type="text"
                      placeholder="Director"
                      value={newMovie.director}
                      onChange={e => setNewMovie({...newMovie, director: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Genre (e.g. Action, Drama)"
                      value={newMovie.genre}
                      onChange={e => setNewMovie({...newMovie, genre: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Cast (comma separated)"
                      value={Array.isArray(newMovie.cast) ? newMovie.cast.join(', ') : newMovie.cast}
                      onChange={e => setNewMovie({...newMovie, cast: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Video URL (Direct link or YouTube)"
                      value={newMovie.video_url}
                      onChange={e => setNewMovie({...newMovie, video_url: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                    <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={newMovie.is_featured}
                          onChange={e => setNewMovie({...newMovie, is_featured: e.target.checked})}
                        />
                        <div className={cn(
                          "w-10 h-5 rounded-full transition-colors",
                          newMovie.is_featured ? "bg-red-600" : "bg-white/10"
                        )}></div>
                        <div className={cn(
                          "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                          newMovie.is_featured ? "translate-x-5" : "translate-x-0"
                        )}></div>
                      </div>
                      <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                        Metti in Home (Preferito)
                      </span>
                    </label>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors">
                        {isEditing ? 'Update Movie' : 'Save to Database'}
                      </button>
                      {isEditing && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsEditing(false);
                            setEditingId(null);
                            setNewMovie({ title: '', year: '', rating: '', image: '', description: '', director: '', cast: [], video_url: '', genre: '', is_featured: false });
                          }}
                          className="px-6 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Movie List */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-4">
                  {movies.length === 0 && (
                    <div className="text-center py-24 glass rounded-3xl border border-dashed border-white/10">
                      <p className="text-white/40">No movies in database yet.</p>
                    </div>
                  )}
                  {movies.map(movie => (
                    <div key={movie.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-6 group">
                      <img src={movie.image} className="w-20 h-28 object-cover rounded-lg" alt="" />
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{movie.title}</h4>
                        <p className="text-white/40 text-sm">{movie.year} • {movie.director}</p>
                      </div>
                      <div className="flex gap-2 opacity-100 transition-opacity">
                        <button onClick={() => handleEditMovie(movie)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white" title="Edit">
                          <Clock size={18} />
                        </button>
                        <button onClick={() => setSelectedMovie(movie)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white" title="Info">
                          <Info size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMovie(movie.id);
                          }} 
                          className="p-2 bg-red-500/10 hover:bg-red-500/30 rounded-lg text-red-500 transition-all"
                          title="Delete"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hero Section */}
        {!searchQuery && !selectedMovie && activeTab !== 'admin' && (
          <section className="relative h-[90vh] w-full overflow-hidden">
            {(() => {
              const heroMovie = heroMovies[currentIndex] || heroMovies[0];

              return (
                <div className="relative w-full h-full">
                  <div className="absolute inset-0">
                    <motion.img
                      key={heroMovie.id}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ duration: 1.5 }}
                      src={heroMovie.image}
                      alt={heroMovie.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/20 to-transparent" />
                  </div>

                  <div className="relative h-full flex flex-col justify-end px-6 pb-24 max-w-7xl mx-auto">
                    <motion.div
                      key={heroMovie.id + "-content"}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Featured</span>
                        <span className="text-white/60 text-sm font-medium">{heroMovie.year} • {heroMovie.genre || 'Cinema'} • {heroMovie.rating} Rating</span>
                      </div>
                      <h2 className="text-6xl md:text-8xl font-display font-bold mb-6 leading-tight">
                        {heroMovie.title}
                      </h2>
                      <p className="text-lg text-white/70 max-w-2xl mb-8 leading-relaxed line-clamp-3">
                        {heroMovie.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setSelectedMovie(heroMovie)}
                          className="bg-white text-black px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-white/90 transition-colors"
                        >
                          <Play className="fill-current" size={20} /> Watch Trailer
                        </button>
                        <button 
                          onClick={() => setSelectedMovie(heroMovie)}
                          className="bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-white/20 transition-colors border border-white/10"
                        >
                          <Info size={20} /> More Info
                        </button>
                      </div>
                    </motion.div>
                    
                    {heroMovies.length > 1 && (
                      <div className="absolute bottom-12 right-6 flex gap-2">
                        {heroMovies.map((_, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              idx === currentIndex ? "bg-red-600 w-8" : "bg-white/20 hover:bg-white/40"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* Search Results / AI Insights */}
        {(searchQuery || aiResponse) && (
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display font-bold">
                {isSearching ? 'Searching...' : `Results for "${searchQuery}"`}
              </h3>
              <button 
                onClick={() => {setSearchQuery(''); setAiResponse(null); setSearchResults([]);}}
                className="text-white/40 hover:text-white text-sm"
              >
                Clear Search
              </button>
            </div>

            {aiResponse && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 p-8 rounded-3xl glass border border-white/10"
              >
                <div className="flex items-center gap-2 mb-4 text-red-500">
                  <TrendingUp size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">AI Insights & Reviews</span>
                </div>
                <div className="prose prose-invert max-w-none prose-p:text-white/70 prose-headings:font-display">
                  <Markdown>{aiResponse}</Markdown>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        {!searchQuery && activeTab !== 'admin' && (
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-display font-bold">
                  {selectedGenre ? `Genre: ${selectedGenre}` : 'From Your Database'}
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedGenre(null)}
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-full transition-colors",
                      !selectedGenre ? "bg-red-600 text-white" : "bg-white/10 hover:bg-white/20"
                    )}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {(selectedGenre 
                ? movies.filter(m => m.genre?.toLowerCase().includes(selectedGenre.toLowerCase()))
                : movies.length > 0 ? movies : MOCK_MOVIES
              ).map((movie) => (
                <MovieCard key={movie.id} movie={movie} onClick={() => setSelectedMovie(movie)} />
              ))}
            </div>
          </section>
        )}

        {/* Categories / Bento Grid */}
        {!searchQuery && activeTab !== 'admin' && (
          <section className="px-6 py-12 max-w-7xl mx-auto">
            <h3 className="text-2xl font-display font-bold mb-8">Explore Genres</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[400px]">
              <GenreCard 
                title="Action" 
                image="https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&q=80&w=600" 
                className="md:col-span-2" 
                onClick={() => setSelectedGenre('Action')}
              />
              <GenreCard 
                title="Sci-Fi" 
                image="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600" 
                onClick={() => setSelectedGenre('Sci-Fi')}
              />
              <GenreCard 
                title="Drama" 
                image="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600" 
                onClick={() => setSelectedGenre('Drama')}
              />
              <GenreCard 
                title="Horror" 
                image="https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600" 
                onClick={() => setSelectedGenre('Horror')}
              />
              <GenreCard 
                title="Comedy" 
                image="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=600" 
                className="md:col-span-2" 
                onClick={() => setSelectedGenre('Comedy')}
              />
              <GenreCard 
                title="Romance" 
                image="https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=600" 
                onClick={() => setSelectedGenre('Romance')}
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-24 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h1 className="text-2xl font-display italic font-bold tracking-tighter mb-6">
              CINE<span className="text-red-600">MODERN</span>
            </h1>
            <p className="text-white/40 max-w-sm leading-relaxed">
              The next generation of movie discovery. Powered by AI, designed for cinema lovers. 
              Find reviews, trailers, and where to watch your favorite films.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-white/60">Platform</h4>
            <ul className="space-y-4 text-sm text-white/40">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-white/60">Legal</h4>
            <ul className="space-y-4 text-sm text-white/40">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Settings</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-white/20">
          <p>© 2024 CineModern. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Letterboxd</a>
          </div>
        </div>
      </footer>

      {/* Movie Detail Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-12"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedMovie(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedMovie(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-black rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="h-[300px] md:h-full relative">
                  <img 
                    src={selectedMovie.image} 
                    alt={selectedMovie.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent md:hidden" />
                </div>
                <div className="p-8 md:p-12 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-red-500 font-bold text-sm tracking-widest uppercase">{selectedMovie.year}</span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} className="fill-current" />
                      <span className="text-sm font-bold">{selectedMovie.rating}</span>
                    </div>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">{selectedMovie.title}</h2>
                  <div className="max-h-40 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                    <p className="text-white/60 leading-relaxed">
                      {selectedMovie.description}
                    </p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white/30 w-20">Genre</span>
                      <span className="font-medium text-red-500">{selectedMovie.genre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white/30 w-20">Director</span>
                      <span className="font-medium">{selectedMovie.director}</span>
                    </div>
                    <div className="flex items-start gap-4 text-sm">
                      <span className="text-white/30 w-20">Cast</span>
                      <span className="font-medium flex-1">{selectedMovie.cast?.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-4">
                    {selectedMovie.trailer_url ? (
                      <a 
                        href={selectedMovie.trailer_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-white text-black py-4 rounded-xl font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Play size={18} className="fill-current" /> Watch Trailer
                      </a>
                    ) : (
                      <button className="flex-1 bg-white text-black py-4 rounded-xl font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                        <Play size={18} className="fill-current" /> Watch Now
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const updatedMovie = { ...selectedMovie, is_featured: !selectedMovie.is_featured };
                        handleSaveMovie(updatedMovie);
                        setSelectedMovie(updatedMovie);
                      }}
                      className={cn(
                        "p-4 rounded-xl border transition-all flex items-center justify-center",
                        selectedMovie.is_featured ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                      title={selectedMovie.is_featured ? "Rimuovi dai Preferiti" : "Aggiungi ai Preferiti"}
                    >
                      <Heart size={18} fill={selectedMovie.is_featured ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MovieCard({ movie, onClick }: { movie: Movie; onClick: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-4 border border-white/5">
        <img 
          src={movie.image} 
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <Play className="fill-white ml-1" size={20} />
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
          <Star size={10} className="text-yellow-500 fill-current" />
          <span className="text-[10px] font-bold">{movie.rating}</span>
        </div>
      </div>
      <h4 className="font-bold text-sm group-hover:text-red-500 transition-colors line-clamp-1">{movie.title}</h4>
      <p className="text-white/40 text-xs mt-1">{movie.year} • Movie</p>
    </motion.div>
  );
}

function GenreCard({ title, image, className, onClick }: { title: string; image: string; className?: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn("relative rounded-2xl overflow-hidden group cursor-pointer border border-white/5", className)}
    >
      <img 
        src={image} 
        alt={title}
        className="w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-70"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-4 left-4">
        <h4 className="text-xl font-display font-bold">{title}</h4>
      </div>
    </div>
  );
}
