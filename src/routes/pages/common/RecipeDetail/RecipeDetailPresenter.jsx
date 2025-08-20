// src/routes/pages/common/RecipeDetail/RecipeDetailPresenter.jsx
import React, { useMemo, useState } from "react";
import "./RecipeDetail.css";

// [임승재 넣음] 언어 선택 버튼 컴포넌트
import Translation from "../translation/translation";

// 영양 단위
const nutritionUnit = {
  칼로리: "kcal",
  탄수화물: "g",
  단백질: "g",
  지방: "g",
  나트륨: "mg",
};

const itemsPerPage = 3;

// 별점 표시(읽기 전용) 컴포넌트
const StarRating = ({ rating = 0 }) => {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="star-rating"
      style={{ cursor: "default", userSelect: "none" }}
      aria-label="별점 표시"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            color: star <= (hover || rating) ? "#f5a623" : "#ddd",
            fontSize: "24px",
            userSelect: "none",
          }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default function RecipeDetailPresenter({
  recipe,
  loading,
  error,
  relatedRecipes,
  userRating,
  onRate,              // 별점 제출 콜백
  favorite,            // 찜 여부
  onToggleFavorite,    // 찜 토글 콜백
  favoriteLoading,     // 찜 버튼 로딩 여부

  // [임승재 넣음] 언어 스위치용 props
  lang,
  onChangeLang,
}) {
  const [slideIndex, setSlideIndex] = useState(0);

  // 모달 상태(별점 입력)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempRating, setTempRating] = useState(userRating || 0);
  const [hover, setHover] = useState(0);

  // [임승재 넣음] 만드는 법(steps) 계산
  // - 번역 응답: recipe.steps / recipe.step_images 우선
  // - 한국어(기존): MANUAL01~20 / MANUAL_IMG01~20 폴백
  const stepsToRender = useMemo(() => {
    if (!recipe) return [];
    // 번역 응답(배열) 우선
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      const imgs = Array.isArray(recipe.step_images) ? recipe.step_images : [];
      return recipe.steps.map((step, i) => ({ step: String(step || "").trim(), img: imgs[i] }));
    }
    // 폴백: 한국어 MANUALxx
    const arr = [];
    for (let i = 1; i <= 20; i++) {
      const step = recipe[`MANUAL${String(i).padStart(2, "0")}`];
      const img = recipe[`MANUAL_IMG${String(i).padStart(2, "0")}`];
      if (step && typeof step === "string" && step.trim()) {
        arr.push({ step: step.trim(), img });
      }
    }
    return arr;
  }, [recipe]); // [임승재 넣음] 끝

  const maxSlides = relatedRecipes ? Math.ceil(relatedRecipes.length / itemsPerPage) : 0;
  const visibleCards = relatedRecipes
    ? relatedRecipes.slice(slideIndex * itemsPerPage, (slideIndex + 1) * itemsPerPage)
    : [];

  const handlePrev = () => setSlideIndex((prev) => (prev > 0 ? prev - 1 : maxSlides - 1));
  const handleNext = () => setSlideIndex((prev) => (prev < maxSlides - 1 ? prev + 1 : 0));
  const handleSimilarClick = (rcp_seq) => {
    if (!rcp_seq) return;
    window.location.href = `/recipedetail?id=${rcp_seq}`;
  };

  // 별점 모달 핸들러
  const openModal = () => {
    setTempRating(userRating || 0);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
  const onSubmitRating = () => {
    if (tempRating > 0) {
      onRate?.(tempRating);
      closeModal();
    }
  };

  if (loading) return <div className="detail-loading">로딩 중...</div>;
  if (error) return <div className="detail-error">{error}</div>;
  if (!recipe) return <div>상세 레시피가 없습니다.</div>;

  return (
    <>
      <div className="recipe-detail-wrapper">
        {/* [임승재 넣음] 언어 버튼: 제목 위, 우측 정렬 */}
        <Translation
          className="detail-lang-switch"  // 우측 정렬용 클래스
          value={lang}
          onChange={onChangeLang}
        />
        {/* [임승재 넣음] 끝 */}

        {/* 타이틀 및 즐겨찾기 */}
        <div className="recipe-detail-title-row">
          <h2 className="recipe-detail-title">{recipe.name || recipe.RCP_NM}</h2>
          <button
            className={`favorite-btn${favorite ? " on" : ""}`}
            aria-label={favorite ? "즐겨찾기 취소" : "즐겨찾기 추가"}
            onClick={favoriteLoading ? undefined : onToggleFavorite}
            disabled={favoriteLoading}
          >
            {favorite ? "★" : "☆"}
          </button>
        </div>

        {/* 별점 및 조회수 */}
        <div className="recipe-rating-info" style={{ marginBottom: 16 }}>
          <div>
            <strong>평균 별점:</strong>{" "}
            {recipe.avg_rating?.toFixed?.(1) ?? "0.0"} ({recipe.rating_count ?? 0}명)
          </div>
          <div>
            <strong>조회수:</strong> {recipe.view_count ?? 0}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>내 별점 주기:</strong>
            <div
              style={{ display: "inline-block", cursor: "pointer" }}
              onClick={openModal}
              aria-label="별점 입력 모달 열기"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openModal();
              }}
            >
              <StarRating rating={userRating ?? 0} />
            </div>
          </div>
        </div>

        {/* 이미지 및 영양 정보 */}
        <div className="recipe-detail-main">
          <div className="recipe-detail-imgblock">
            <img
              src={recipe.image_url || recipe.ATT_FILE_NO_MAIN}
              alt={recipe.name || "레시피 이미지"}
              className="recipe-detail-img"
            />
          </div>
          <div className="recipe-detail-info">
            <div className="nutrition-title">영양정보 (1인분)</div>
            <ul className="nutrition-list">
              {Object.entries({
                칼로리: recipe.INFO_ENG,
                탄수화물: recipe.INFO_CAR,
                단백질: recipe.INFO_PRO,
                지방: recipe.INFO_FAT,
                나트륨: recipe.INFO_NA,
              }).map(([key, val]) =>
                val ? (
                  <li key={key}>
                    <span className="nutri-key">{key}</span>
                    <span className="nutri-value">{val}</span>
                    <span className="unit">{nutritionUnit[key]}</span>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        </div>

        {/* [임승재 넣음] 재료 섹션: 번역 응답 우선(ingredients 배열), 없으면 기존 설명으로 폴백 */}
        {(Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) ? (
          <section>
            <div className="ingredient-title">재료</div>
            <ul className="ingredient-list">
              {recipe.ingredients.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        ) : (recipe.description || recipe.RCP_PARTS_DTLS) ? (
          <section>
            <div className="ingredient-title">재료</div>
            <div className="ingredient-desc">{recipe.description || recipe.RCP_PARTS_DTLS}</div>
          </section>
        ) : null}

        {/* 설명(옵션): 번역 응답의 description이 실제 설명 텍스트일 수 있어 별도 표기 */}
        {recipe.description && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
          <section style={{ marginTop: 16 }}>
            <div className="ingredient-title">설명</div>
            <p>{recipe.description}</p>
          </section>
        )}
        {/* [임승재 넣음] 끝 */}
        
        {/* 만드는 법 */}
        {stepsToRender.length > 0 && (
          <section>
            <div className="manual-title">만드는 법</div>
            <div className="recipe-detail-manual-list-pigma">
              {stepsToRender.map((m, idx) => (
                <div className="manual-pigma-row" key={idx}>
                  <div className="manual-pigma-img-wrap">
                    {m.img && <img src={m.img} alt={`step${idx + 1}`} className="manual-pigma-img" />}
                  </div>
                  <div className="manual-pigma-box">
                    <span className="manual-pigma-num">{idx + 1}</span>
                    <span className="manual-pigma-desc">
                      {String(m.step).replace(/^(\d+\.)/, "").trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TIP */}
        {recipe.RCP_NA_TIP && (
          <section className="recipe-detail-tip-pigma">
            <strong>TIP: </strong>
            {recipe.RCP_NA_TIP}
          </section>
        )}

        {/* 유사 레시피 슬라이더 */}
        <section className="recipe-detail-similar">
          <h3 className="similar-title">유사한 레시피</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="slider-btn" onClick={handlePrev} disabled={maxSlides <= 1}>
              &lt;
            </button>
            <div className="similar-recipe-list" style={{ display: "flex", gap: "20px" }}>
              {visibleCards.map((item, i) => (
                <div
                  className="similar-recipe-card"
                  key={item.RCP_SEQ || item.id || i}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSimilarClick(item.RCP_SEQ || item.id)}
                >
                  <img src={item.img} alt={item.name} />
                  <div className="similar-name">{item.name}</div>
                  <div className="similar-rating">
                    {"★".repeat(item.rating)}
                    {"☆".repeat(5 - item.rating)}
                    <span className="similar-views">조회수 {item.views}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="slider-btn" onClick={handleNext} disabled={maxSlides <= 1}>
              &gt;
            </button>
          </div>
          {maxSlides > 1 && (
            <div style={{ textAlign: "center", marginTop: "8px", color: "#999" }}>
              {slideIndex + 1}/{maxSlides}
            </div>
          )}
        </section>
      </div>

      {/* 별점 입력 모달 */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          className="modal-backdrop"
          aria-modal={true}
          role="dialog"
          aria-label="별점 입력 모달"
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "320px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>별점을 선택하세요</h3>
            <div style={{ marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setTempRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  style={{
                    color: star <= (hover || tempRating) ? "#f5a623" : "#ddd",
                    fontSize: "36px",
                    cursor: "pointer",
                    userSelect: "none",
                    marginRight: 4,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${star}점 별점 선택`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setTempRating(star);
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <button
              onClick={onSubmitRating}
              disabled={tempRating === 0}
              style={{
                padding: "8px 24px",
                fontSize: "16px",
                cursor: tempRating === 0 ? "not-allowed" : "pointer",
                marginRight: 12,
              }}
            >
              확인
            </button>
            <button
              onClick={closeModal}
              style={{ padding: "8px 24px", fontSize: "16px", cursor: "pointer" }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
}
