import { Link } from 'react-router-dom';
import { categories } from '../data/puzzles';
import { Icon } from '../components/Icon';

export function Home() {
  return (
    <main className="home page">
      <div className="home-heading">
        <h1>
          Что соберём сегодня<span className="heading-question">?</span>
        </h1>
        <p>Выбирай любимую картинку</p>
      </div>
      <div className="category-grid">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/category/${category.id}`}
            className={`category-card ${category.color}`}
          >
            <div className="category-art">
              <img src={category.coverImage} alt="" />
            </div>
            <div className="category-label">
              <div>
                <h2>{category.title}</h2>
                <p>{category.subtitle}</p>
              </div>
              <span className="card-arrow">
                <Icon name="arrow" />
              </span>
            </div>
          </Link>
        ))}
        <Link to="/my-puzzles" className="category-card sky personal-card">
          <div className="personal-art" aria-hidden="true">
            <div className="photo-back" />
            <div className="photo-front">
              <Icon name="image" size={76} />
              <span className="photo-plus">
                <Icon name="plus" size={27} />
              </span>
            </div>
            <span className="little-star">✦</span>
            <span className="little-dot" />
          </div>
          <div className="category-label">
            <div>
              <h2>Мои пазлы</h2>
              <p>Из любимых фотографий</p>
            </div>
            <span className="card-arrow">
              <Icon name="arrow" />
            </span>
          </div>
        </Link>
      </div>
    </main>
  );
}
