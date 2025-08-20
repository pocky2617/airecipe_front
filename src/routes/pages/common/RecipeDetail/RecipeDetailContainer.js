import React, {
  useEffect,
  useState,
  useMemo,
  useContext,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import RecipeDetailPresenter from "./RecipeDetailPresenter";
import { LoginContext } from "../SignIn/LoginContext";

/** 언어코드 정규화 */
function normalizeLang(code) {
  const c = (code || "ko").toLowerCase();
  if (c === "jp") return "ja";
  if (c === "cn" || c === "zh") return "zh-cn";
  if (c === "kr" || c === "ko-kr") return "ko";
  return ["ko", "en", "ja", "zh-cn"].includes(c) ? c : "ko";
}

/** API 베이스 */
const API_BASE = "http://127.0.0.1:8000/api";

/** 필드 정규화 */
function normalizeRecipeFields(recipeObj) {
  return {
    id: recipeObj.id || recipeObj.RCP_SEQ,
    name: recipeObj.name || recipeObj.RCP_NM,
    image_url: recipeObj.image_url || recipeObj.ATT_FILE_NO_MAIN,
    description: recipeObj.description || recipeObj.RCP_PARTS_DTLS,
    category: recipeObj.category || recipeObj.CATEGORY,
    ingredients: recipeObj.ingredients || recipeObj.INGREDIENTS || [],
    INFO_ENG: recipeObj.INFO_ENG,
    INFO_CAR: recipeObj.INFO_CAR,
    INFO_PRO: recipeObj.INFO_PRO,
    INFO_FAT: recipeObj.INFO_FAT,
    INFO_NA: recipeObj.INFO_NA,
    RCP_NA_TIP: recipeObj.RCP_NA_TIP,
    avg_rating: recipeObj.avg_rating || 0,
    rating_count: recipeObj.rating_count || 0,
    view_count: recipeObj.view_count || 0,
    ...recipeObj,
  };
}

export default function RecipeDetailContainer() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromState = location.state?.id;
  const idFromQuery = searchParams.get("id");
  const id = idFromState || idFromQuery;

  const relatedList = location.state?.list;

  const { user } = useContext(LoginContext);
  const userId = user?.user_id;

  const [recipe, setRecipe] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRating, setUserRating] = useState(0);

  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  /** 언어 상태: 기본 ko, URL에 lang 있으면 그 값 사용(새 레시피 진입 시 초기화됨) */
  const initialLang = normalizeLang(searchParams.get("lang") || "ko");
  const [lang, setLang] = useState(initialLang);

  /** 레시피가 바뀌면 lang을 다시 ko(또는 URL의 lang)로 리셋 */
  useEffect(() => {
    const next = normalizeLang(new URLSearchParams(location.search).get("lang") || "ko");
    setLang(next);
  }, [id, location.search]);

  /** 레시피별 최초 1회만 조회수 증가 */
  const firstLoadRef = useRef(true);
  const lastIdRef = useRef(id);

  /** 상세 조회 (incrementView: 조회수 증가 여부) */
  const fetchRecipeDetail = (incrementView = true) => {
    if (!id) {
      setRecipe(null);
      setError("잘못된 레시피 id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const u = new URL(`${API_BASE}/recipedetail`);
    u.searchParams.set("id", id);
    u.searchParams.set("lang", normalizeLang(lang));
    if (userId) u.searchParams.set("user_id", userId);
    if (!incrementView) u.searchParams.set("increment_view", "false");

    fetch(u.toString())
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`서버 오류: ${res.status} - ${res.statusText} - ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setRecipe(normalizeRecipeFields(data));
        setUserRating(data.user_rating || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "레시피를 불러오는 데 실패했습니다.");
        setLoading(false);
      });
  };

  /** id/user/lang 변화 시 재요청.
   *  - id가 바뀌면 firstLoadRef를 true로 리셋 → 새 레시피 첫 로드에서만 조회수 증가
   *  - 언어 바뀌면 increment_view=false로 재요청
   */
  useEffect(() => {
    if (lastIdRef.current !== id) {
      firstLoadRef.current = true;
      lastIdRef.current = id;
    }
    const inc = firstLoadRef.current;
    fetchRecipeDetail(inc);
    if (inc) firstLoadRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, lang]);

  /** 관련 레시피 */
  useEffect(() => {
    if (relatedList && Array.isArray(relatedList) && relatedList.length > 0) {
      setAllRecipes(relatedList.map(normalizeRecipeFields));
    } else {
      fetch(`${API_BASE}/recipelist`)
        .then((res) => res.json())
        .then((data) => {
          setAllRecipes(Array.isArray(data) ? data.map(normalizeRecipeFields) : []);
        })
        .catch(() => setAllRecipes([]));
    }
  }, [relatedList]);

  const relatedRecipes = useMemo(() => {
    if (!recipe || !recipe.category || allRecipes.length === 0) return [];
    return allRecipes
      .filter(
        (r) =>
          (r.id || r.RCP_SEQ) !== (recipe.id || recipe.RCP_SEQ) &&
          r.category === recipe.category
      )
      .slice(0, 10)
      .map((r) => ({
        img: r.image_url || r.ATT_FILE_NO_MAIN,
        name: r.name || r.RCP_NM,
        rating: r.avg_rating ? Math.round(r.avg_rating) : 5,
        views: r.view_count || 0,
        RCP_SEQ: r.id || r.RCP_SEQ,
      }));
  }, [recipe, allRecipes]);

  /** 별점 등록 */
  const submitUserRating = (rating) => {
    if (!id) return;
    if (!userId) {
      alert("별점 등록은 로그인 후 가능합니다.");
      return;
    }
    const requestBody = { user_id: userId, rating };
    fetch(`${API_BASE}/recipes/${id}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`서버 오류: ${res.status} - ${res.statusText} - ${text}`);
        }
        return res.json();
      })
      .then(() => {
        setUserRating(rating);
        fetchRecipeDetail(false); // 조회수 증가 없이 갱신
      })
      .catch(() => {
        alert("별점 등록에 실패했습니다. 다시 시도해주세요.");
      });
  };

  /** 즐겨찾기 여부 확인 */
  useEffect(() => {
    if (userId && id) {
      setFavoriteLoading(true);
      fetch(`http://localhost:8000/api/favorites/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.favorites)) {
            setFavorite(!!data.favorites.find((r) => String(r.id) === String(id)));
          } else if (Array.isArray(data)) {
            setFavorite(!!data.find((r) => String(r.id) === String(id)));
          } else {
            setFavorite(false);
          }
        })
        .catch(() => setFavorite(false))
        .finally(() => setFavoriteLoading(false));
    } else {
      setFavorite(false);
    }
  }, [userId, id]);

  /** 즐겨찾기 토글 */
  const handleToggleFavorite = () => {
    if (!userId) {
      alert("찜 기능은 로그인 후 이용 가능합니다.");
      return;
    }
    setFavoriteLoading(true);
    const url = `${API_BASE}/favorites`;
    const method = favorite ? "DELETE" : "POST";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, recipe_id: Number(id) }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }
        setFavorite(!favorite);
      })
      .catch(() => {
        alert("찜 기능 처리에 실패했습니다.");
      })
      .finally(() => setFavoriteLoading(false));
  };

  return (
    <RecipeDetailPresenter
      recipe={recipe}
      loading={loading}
      error={error}
      relatedRecipes={relatedRecipes}
      userRating={userRating}
      onRate={submitUserRating}
      favorite={favorite}
      onToggleFavorite={handleToggleFavorite}
      favoriteLoading={favoriteLoading}
      /** 번역 관련 props (Presenter 내부 Translation에서 사용) 임승재 추가*/
      lang={lang}
      onChangeLang={setLang}
    />
  );
}
