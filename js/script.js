import { jobs, loadJobs, addJob, deleteJob } from '../data/jobs.js';

// Select elements
const categorySelect = document.getElementById('category-select');
const jobListings = document.getElementById('job-listings');
const recommendations = document.getElementById('recommendations');
const recommendationList = document.getElementById('recommendation-list');
const notificationModal = document.getElementById('notification-modal');
const notificationJobs = document.getElementById('notification-jobs');
const closeNotification = document.querySelector('.close-notification');
const recommendedModal = document.getElementById('recommended-modal');

// 사용자 행동 로깅 함수 추가
function logAction(action, details) {
    console.log('Action:', action, 'Details:', details);
    const logs = JSON.parse(localStorage.getItem('userLogs')) || [];
    const email = currentUser ? currentUser.email : 'anonymous';
    const timestamp = new Date().toISOString();
    logs.push({ email, action, details, timestamp, userAgent: navigator.userAgent });
    localStorage.setItem('userLogs', JSON.stringify(logs));
}

// NewsAPI를 활용한 실시간 뉴스 표시 로직
// NewsAPI를 활용한 실시간 뉴스 표시 로직
async function displayRealTimeNews() {
  const newsList = document.getElementById('news-list');
  if (!newsList) {
      console.warn('news-list 요소를 찾을 수 없습니다.');
      return;
  }

  newsList.innerHTML = '<p class="loading-message">뉴스 로드 중...</p>';

  const apiKey = 'd591f93e2ddd4bcaa21b714352153438';
  const keywords = ['employment', 'corporate'];
  let currentKeywordIndex = 0;
  let currentPage = 1;
  const maxDisplay = 3;
  let newsInterval = null;

  async function fetchNews(keyword) {
      try {
          const response = await fetch(
              `https://newsapi.org/v2/everything?q=${keyword}&language=en&sortBy=publishedAt&apiKey=${apiKey}&page=${currentPage}&pageSize=${maxDisplay}`
          );
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.status === 'ok' && data.articles) {
              return data.articles;
          } else {
              console.error('NewsAPI 호출 실패:', data);
              logAction('error', { message: 'NewsAPI 호출 실패', details: data });
              return [];
          }
      } catch (error) {
          console.error('NewsAPI 호출 중 오류:', error.message);
          logAction('error', { message: 'NewsAPI 호출 중 오류', details: error.message });
          return [];
      }
  }

  async function updateNews() {
      const keyword = keywords[currentKeywordIndex];
      newsList.innerHTML = '<p class="loading-message">뉴스 로드 중...</p>';
      const articles = await fetchNews(keyword);

      newsList.innerHTML = '';
      if (articles.length === 0) {
          newsList.innerHTML = '<p class="error-message">뉴스를 로드할 수 없습니다. 나중에 다시 시도해주세요.</p>';
          return;
      }

      articles.forEach((article, index) => {
          const newsItem = document.createElement('div');
          newsItem.className = 'news-card hidden';
          newsItem.style.animationDelay = `${index * 0.1}s`;
          newsItem.innerHTML = `
              <img src="${article.urlToImage || 'images/placeholder.jpg'}" alt="${article.title}" class="news-image">
              <div class="news-content">
                  <a href="${article.url}" target="_blank">${article.title}</a>
                  <p class="news-source">${article.source.name}</p>
                  <p class="news-description">${article.description || '설명 없음'}</p>
              </div>
          `;
          newsItem.querySelector('a').addEventListener('click', (e) => {
              logAction('clickNews', { url: article.url, title: article.title });
          });
          newsList.appendChild(newsItem);

          const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                  if (entry.isIntersecting) {
                      entry.target.classList.remove('hidden');
                      entry.target.classList.add('fade-in');
                      observer.unobserve(entry.target);
                  }
              });
          }, { threshold: 0.1 });
          observer.observe(newsItem);
      });

      currentKeywordIndex = (currentKeywordIndex + 1) % keywords.length;
      currentPage = currentKeywordIndex === 0 ? currentPage + 1 : currentPage;

      logAction('updateNews', { keyword, articleCount: articles.length });
  }

  await updateNews();
  if (newsInterval) clearInterval(newsInterval);
  newsInterval = setInterval(updateNews, 50000);
  logAction('viewNews', { keywords: keywords[currentKeywordIndex], intervalId: newsInterval });
}

// Recommendation map
const recommendationMap = {
    "all": ["소프트웨어 개발", "데이터 과학 및 분석", "마케팅 및 광고"],
    "소프트웨어 개발": ["데이터 과학 및 분석", "디자인"],
    "데이터 과학 및 분석": ["소프트웨어 개발", "디자인"],
    "디자인": ["소프트웨어 개발", "마케팅 및 광고"],
    "HR 및 채용": ["프로젝트 관리", "운영"],
    "프로젝트 관리": ["HR 및 채용", "운영"],
    "운영": ["프로젝트 관리", "재무 및 회계"],
    "마케팅 및 광고": ["세일즈", "디자인"],
    "세일즈": ["마케팅 및 광고", "고객 서비스"],
    "고객 서비스": ["세일즈", "운영"],
    "재무 및 회계": ["운영", "프로젝트 관리"]
};

// trackPageView function with fallback
function trackPageView(page) {
  try {
      let pageViews = JSON.parse(localStorage.getItem('pageViews')) || {};
      console.log(`Tracking page view for: ${page}, Current pageViews:`, pageViews); // Debug log
      pageViews[page] = (pageViews[page] || 0) + 1;
      localStorage.setItem('pageViews', JSON.stringify(pageViews));
      console.log(`Updated pageViews after tracking ${page}:`, pageViews); // Debug log
      logAction('pageView', { page });
  } catch (error) {
      console.error('Failed to track page view:', error);
      // Fallback: Initialize with minimal data if localStorage fails
      localStorage.setItem('pageViews', JSON.stringify({ [page]: 1 }));
  }
}

// Track click data
function trackClick(category, jobId) {
    const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    clickData[category] = (clickData[category] || 0) + 1;
    localStorage.setItem('jobClicks', JSON.stringify(clickData));

    const detailedClicks = JSON.parse(localStorage.getItem('jobClicksDetailed')) || [];
    detailedClicks.push({ jobId, category, timestamp: new Date().toISOString() });
    localStorage.setItem('jobClicksDetailed', JSON.stringify(detailedClicks));

    const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
    allUsersClicks.push({ jobId, category, timestamp: new Date().toISOString() });
    localStorage.setItem('allUsersClicks', JSON.stringify(allUsersClicks));

    logAction('clickJob', { jobId, category });
}

// searchJobs
function searchJobs(query, targetElement) {
    return restrictToLoggedIn(() => {
        if (!targetElement) {
            console.error('검색 대상 요소를 찾을 수 없습니다.');
            return;
        }

        if (targetElement.searchTimeout) clearTimeout(targetElement.searchTimeout);
        targetElement.searchTimeout = setTimeout(() => {
            const filteredJobs = jobs.filter(job =>
                job.title.toLowerCase().includes(query.toLowerCase()) ||
                job.company.toLowerCase().includes(query.toLowerCase())
            );

            targetElement.innerHTML = '';
            if (filteredJobs.length === 0) {
                targetElement.innerHTML = '<p>검색 결과가 없습니다.</p>';
                return;
            }

            filteredJobs.forEach((job, index) => {
                const jobDiv = document.createElement('div');
                jobDiv.className = 'job-card hidden';
                jobDiv.style.animationDelay = `${index * 0.1}s`;
                jobDiv.innerHTML = `
                    <h3>${job.title} - ${job.company}</h3>
                    <p>연봉: ${job.salary}</p>
                    <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                    <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                `;
                const detailButton = jobDiv.querySelector('.detail-button');
                detailButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    detailButton.classList.add('loading');
                    detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                    setTimeout(() => {
                        trackClick(job.category, job.id);
                        window.location.href = `job-detail.html?id=${job.id}`;
                    }, 500);
                });
                targetElement.appendChild(jobDiv);

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.remove('hidden');
                            entry.target.classList.add('fade-in');
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                observer.observe(jobDiv);
            });

            logAction('search', { query, resultsCount: filteredJobs.length });
        }, 300);
    }, false);
}

// displayJobs
function displayJobs(category) {
    return restrictToLoggedIn(() => {
        const jobListings = document.getElementById('job-listings');
        if (jobListings) {
            jobListings.innerHTML = '<p class="loading-message">공고를 로드 중입니다...</p>';
        } else {
            console.error('job-listings 요소를 찾을 수 없습니다.');
            return;
        }

        if (!jobs || jobs.length === 0) {
            handleError('공고 데이터를 로드할 수 없습니다.', 'job-listings');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        let preferredCategories = user && user.preferredCategories ? user.preferredCategories : [];

        let categories = category && category !== 'all'
            ? [category]
            : [...new Set(jobs.map(job => job.category))];

        if (preferredCategories.length > 0) {
            categories.sort((a, b) => {
                const aIsPreferred = preferredCategories.includes(a);
                const bIsPreferred = preferredCategories.includes(b);
                if (aIsPreferred && !bIsPreferred) return -1;
                if (!aIsPreferred && bIsPreferred) return 1;
                return preferredCategories.indexOf(a) - preferredCategories.indexOf(b);
            });
        }

        jobListings.innerHTML = '';
        const fragment = document.createDocumentFragment();

        categories.forEach(cat => {
            const section = document.createElement('section');
            section.className = 'category-section';
            section.innerHTML = `<h2>${cat}</h2><div id="jobs-${cat.replace(/\s/g, '-')}" class="category-jobs"></div>`;
            fragment.appendChild(section);

            const categoryJobs = jobs.filter(j => j.category === cat);
            const jobsContainer = section.querySelector(`#jobs-${cat.replace(/\s/g, '-')}`);
            if (!jobsContainer) {
                console.warn(`jobs-${cat.replace(/\s/g, '-')} 요소를 찾을 수 없습니다.`);
                return;
            }

            if (categoryJobs.length === 0) {
                jobsContainer.innerHTML = '<p>해당 직군에 공고가 없습니다.</p>';
                return;
            }

            categoryJobs.forEach((job, index) => {
                const jobDiv = document.createElement('div');
                jobDiv.className = 'job-card hidden';
                jobDiv.style.animationDelay = `${index * 0.1}s`;
                jobDiv.innerHTML = `
                    <h3>${job.title} - ${job.company}</h3>
                    <p class="highlight">연봉: ${job.salary}</p>
                    <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                    <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                `;
                const detailButton = jobDiv.querySelector('.detail-button');
                detailButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    jobDiv.classList.add('clicked');
                    detailButton.classList.add('loading');
                    detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                    setTimeout(() => {
                        trackClick(job.category, job.id);
                        window.location.href = `job-detail.html?id=${job.id}`;
                    }, 500);
                });
                jobsContainer.appendChild(jobDiv);

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.remove('hidden');
                            entry.target.classList.add('fade-in');
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                observer.observe(jobDiv);
            });
        });

        jobListings.appendChild(fragment);
        logAction('viewJobs', { category, displayedCategories: categories });
    });
}

// addFavoriteJob
function addFavoriteJob(jobId) {
    return restrictToLoggedIn(() => {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        if (!user) {
            console.error('현재 사용자를 찾을 수 없습니다.');
            return;
        }
        user.favorites = user.favorites || [];
        if (!user.favorites.includes(jobId)) {
            user.favorites.push(jobId);
            localStorage.setItem('users', JSON.stringify(users));
            currentUser = { email: user.email, isAdmin: user.isAdmin || false, favorites: user.favorites };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('addFavoriteJob - Updated currentUser:', currentUser);
            console.log('addFavoriteJob - Updated users:', users);

            const favoriteButton = document.querySelector(`.favorite-button[data-job-id="${jobId}"]`);
            if (favoriteButton) {
                favoriteButton.classList.add('favorited');
                favoriteButton.innerHTML = '❤️ 즐겨찾기됨';
            }

            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = '공고가 즐겨찾기에 추가되었습니다!';
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }, 2000);

            if (document.getElementById('favorite-jobs-list')) {
                handleProfile();
            }
            logAction('addFavorite', { jobId, totalFavorites: user.favorites.length });
        } else {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = '이미 즐겨찾기에 추가된 공고입니다.';
            notification.style.backgroundColor = '#ff6b6b';
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }
    });
}

// displayJobDetail
// displayJobDetail
function displayJobDetail() {
  return restrictToLoggedIn(() => {
      const jobDetail = document.getElementById('job-detail');
      if (!jobDetail) {
          console.error('job-detail 요소를 찾을 수 없습니다.');
          return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const jobId = parseInt(urlParams.get('id'), 10);
      if (!jobId || isNaN(jobId)) {
          jobDetail.innerHTML = '<p>유효하지 않은 직무 ID입니다.</p>';
          console.error('유효하지 않은 jobId:', jobId);
          return;
      }

      const job = jobs.find(j => j && j.id === jobId);
      if (!job) {
          jobDetail.innerHTML = '<p>직무를 찾을 수 없습니다. 올바른 ID를 확인하세요.</p>';
          console.error(`ID ${jobId}에 해당하는 직무를 찾을 수 없습니다.`);
          return;
      }

      try {
          const companyImage = document.getElementById('company-image');
          const detailTitle = document.getElementById('detail-title');
          const detailCompany = document.getElementById('detail-company');
          const detailSalary = document.getElementById('detail-salary');
          const detailRemote = document.getElementById('detail-remote');
          const detailDescription = document.getElementById('detail-description');
          const detailExperience = document.getElementById('detail-experience');
          const detailRequirements = document.getElementById('detail-requirements');
          const applyButton = document.querySelector('.apply-button');
          const favoriteButton = document.querySelector('.favorite-button');

          if (!companyImage || !detailTitle || !detailCompany || !detailSalary || 
              !detailRemote || !detailDescription || !detailExperience || !detailRequirements) {
              throw new Error('직무 상세 페이지의 필수 요소가 누락되었습니다.');
          }

          companyImage.classList.add('hidden');
          detailTitle.classList.add('hidden');
          detailCompany.classList.add('hidden');
          detailSalary.classList.add('hidden');
          detailRemote.classList.add('hidden');
          detailDescription.classList.add('hidden');
          detailExperience.classList.add('hidden');
          detailRequirements.classList.add('hidden');

          companyImage.style.backgroundImage = `url(${job.image || 'images/placeholder.jpg'})`;
          detailTitle.textContent = `${job.title || '제목 없음'} - ${job.company || '회사명 없음'}`;
          detailCompany.textContent = `회사: ${job.company || '정보 없음'}`;
          detailSalary.textContent = `연봉: ${job.salary || '정보 없음'}`;
          detailRemote.textContent = `원격 근무: ${job.remote ? '가능' : '불가능'}`;
          detailDescription.textContent = job.description || '설명 없음';
          detailExperience.textContent = job.experience || '요건 없음';
          detailRequirements.innerHTML = '';
          (job.requirements || []).forEach(req => {
              const li = document.createElement('li');
              li.textContent = req || '요구사항 없음';
              detailRequirements.appendChild(li);
          });

          const observer = new IntersectionObserver((entries) => {
              entries.forEach((entry, index) => {
                  if (entry.isIntersecting) {
                      setTimeout(() => {
                          entry.target.classList.remove('hidden');
                          entry.target.classList.add('fade-in');
                      }, index * 100);
                      observer.unobserve(entry.target);
                  }
              });
          }, { threshold: 0.1 });

          [companyImage, detailTitle, detailCompany, detailSalary, detailRemote, detailDescription, detailExperience, detailRequirements]
              .forEach(element => observer.observe(element));

          if (applyButton) {
              applyButton.removeEventListener('click', applyHandler);
              applyButton.addEventListener('click', applyHandler);
              function applyHandler(e) {
                  e.preventDefault();
                  applyButton.classList.add('loading');
                  applyButton.innerHTML = '<span class="spinner"></span> 지원 중...';
                  setTimeout(() => {
                      applyButton.classList.remove('loading');
                      applyButton.innerHTML = '지원 완료';
                      applyButton.classList.add('applied');
                      applyButton.disabled = true;
                      alert('지원이 완료되었습니다.');
                      logAction('applyJob', { jobId, title: job.title, company: job.company });
                  }, 1000);
              }
          }

          if (favoriteButton) {
              const users = JSON.parse(localStorage.getItem('users')) || [];
              const user = users.find(u => u.email === currentUser.email);
              favoriteButton.dataset.jobId = jobId;
              if (user && user.favorites && user.favorites.includes(jobId)) {
                  favoriteButton.classList.add('favorited');
                  favoriteButton.innerHTML = '❤️ 즐겨찾기됨';
              } else {
                  favoriteButton.innerHTML = '즐겨찾기 추가';
              }
              favoriteButton.removeEventListener('click', toggleFavoriteHandler);
              favoriteButton.addEventListener('click', toggleFavoriteHandler);
              function toggleFavoriteHandler() {
                  if (user.favorites && user.favorites.includes(jobId)) {
                      removeFavoriteJob(jobId);
                  } else {
                      addFavoriteJob(jobId);
                  }
              }
          }

          trackClick(job.category, job.id);
      } catch (error) {
          console.error('직무 데이터 렌더링 중 오류 발생:', error);
          jobDetail.innerHTML = '<p>데이터를 표시하는 데 문제가 발생했습니다.</p>';
      }
  });
}

// displayRecommendations
function displayRecommendations(category) {
    return restrictToLoggedIn(() => {
        if (!recommendations || !recommendationList) {
            console.error('recommendations 또는 recommendation-list 요소를 찾을 수 없습니다.');
            return;
        }

        recommendationList.innerHTML = '<p class="loading-message">추천 공고 로드 중...</p>';
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        user.feedback = user.feedback || {};
        const userFeedback = user.feedback;

        const recommendedCategories = getTopClickedCategories(3);
        let recJobs = [];
        recommendedCategories.forEach(recCat => {
            const catJobs = jobs.filter(job => job.category === recCat);
            recJobs = recJobs.concat(catJobs);
        });

        recJobs = recJobs.map(job => {
            let score = 0;
            const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
            score += (clickData[job.category] || 0) * 0.5;
            if (userFeedback[job.id]) {
                score += userFeedback[job.id] === 'like' ? 1 : -1;
            }
            job.score = score;
            return job;
        });

        recJobs = recJobs.sort((a, b) => b.score - a.score).slice(0, 3);
        recommendationList.innerHTML = '';

        const fragment = document.createDocumentFragment();
        recJobs.forEach((job, index) => {
            const recDiv = document.createElement('div');
            recDiv.className = 'job-card hidden';
            recDiv.style.animationDelay = `${index * 0.1}s`;
            recDiv.innerHTML = `
                <p><strong>${job.title} - ${job.company}</strong></p>
                <p>추천 점수: ${job.score.toFixed(2)}</p>
                <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                <button class="feedback-like" data-job-id="${job.id}">${userFeedback[job.id] === 'like' ? '❤️ 좋아요' : '좋아요'}</button>
                <button class="feedback-dislike" data-job-id="${job.id}">${userFeedback[job.id] === 'dislike' ? '👎 싫어요' : '싫어요'}</button>
            `;
            const detailButton = recDiv.querySelector('.detail-button');
            detailButton.addEventListener('click', (e) => {
                e.preventDefault();
                recDiv.classList.add('clicked');
                detailButton.classList.add('loading');
                detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                setTimeout(() => {
                    trackClick(job.category, job.id);
                    window.location.href = `job-detail.html?id=${job.id}`;
                }, 500);
            });

            const likeButton = recDiv.querySelector('.feedback-like');
            likeButton.addEventListener('click', () => {
                userFeedback[job.id] = 'like';
                localStorage.setItem('users', JSON.stringify(users));
                currentUser.feedback = userFeedback;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                displayRecommendations(category);
                logAction('feedbackLikeRecommendation', { jobId: job.id });
            });

            const dislikeButton = recDiv.querySelector('.feedback-dislike');
            dislikeButton.addEventListener('click', () => {
                userFeedback[job.id] = 'dislike';
                localStorage.setItem('users', JSON.stringify(users));
                currentUser.feedback = userFeedback;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                displayRecommendations(category);
                logAction('feedbackDislikeRecommendation', { jobId: job.id });
            });

            fragment.appendChild(recDiv);

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('hidden');
                        entry.target.classList.add('fade-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(recDiv);
        });

        recommendationList.appendChild(fragment);
        if (recJobs.length === 0) {
            recommendationList.innerHTML = '<p>추천 공고가 없습니다.</p>';
        }

        logAction('viewRecommendations', { category, recommendedJobs: recJobs.map(job => ({ id: job.id, title: job.title, score: job.score })) });
    });
}

// Function to show notification
function showNotification() {
    if (!notificationModal || !notificationJobs) return;

    const currentCategory = categorySelect ? categorySelect.value : 'all';
    notificationJobs.innerHTML = '<p class="loading-message">알림 공고 로드 중...</p>';

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === currentUser.email);
    user.feedback = user.feedback || {};
    const userFeedback = user.feedback;

    const recommendedCategories = recommendationMap[currentCategory] || [];
    let recJobs = [];
    recommendedCategories.forEach(recCat => {
        const catJobs = jobs.filter(job => job.category === recCat);
        recJobs = recJobs.concat(catJobs);
    });

    recJobs = recJobs.map(job => {
        let score = 0;
        const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
        score += (clickData[job.category] || 0) * 0.5;
        if (userFeedback[job.id]) {
            score += userFeedback[job.id] === 'like' ? 1 : -1;
        }
        job.score = score;
        return job;
    });

    recJobs = recJobs.sort((a, b) => b.score - a.score).slice(0, 3);
    notificationJobs.innerHTML = '';

    const fragment = document.createDocumentFragment();
    recJobs.forEach((job, index) => {
        const jobDiv = document.createElement('div');
        jobDiv.className = 'job-card hidden';
        jobDiv.style.animationDelay = `${index * 0.1}s`;
        jobDiv.innerHTML = `
            <h3>${job.title} - ${job.company}</h3>
            <p>추천 점수: ${job.score.toFixed(2)}</p>
            <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
            <button class="feedback-like" data-job-id="${job.id}">${userFeedback[job.id] === 'like' ? '❤️ 좋아요' : '좋아요'}</button>
            <button class="feedback-dislike" data-job-id="${job.id}">${userFeedback[job.id] === 'dislike' ? '👎 싫어요' : '싫어요'}</button>
        `;
        const detailButton = jobDiv.querySelector('.detail-button');
        detailButton.addEventListener('click', (e) => {
            e.preventDefault();
            jobDiv.classList.add('clicked');
            detailButton.classList.add('loading');
            detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
            setTimeout(() => {
                trackClick(job.category, job.id);
                window.location.href = `job-detail.html?id=${job.id}`;
            }, 500);
        });

        const likeButton = jobDiv.querySelector('.feedback-like');
        likeButton.addEventListener('click', () => {
            userFeedback[job.id] = 'like';
            localStorage.setItem('users', JSON.stringify(users));
            currentUser.feedback = userFeedback;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification();
            logAction('feedbackLikeNotification', { jobId: job.id });
        });

        const dislikeButton = jobDiv.querySelector('.feedback-dislike');
        dislikeButton.addEventListener('click', () => {
            userFeedback[job.id] = 'dislike';
            localStorage.setItem('users', JSON.stringify(users));
            currentUser.feedback = userFeedback;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification();
            logAction('feedbackDislikeNotification', { jobId: job.id });
        });

        fragment.appendChild(jobDiv);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('hidden');
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        observer.observe(jobDiv);
    });

    notificationJobs.appendChild(fragment);
    if (recJobs.length > 0) {
        notificationModal.classList.add('show');
        notificationModal.classList.add('scale-up');
    }

    logAction('viewNotification', { category: currentCategory, recommendedJobs: recJobs.map(job => ({ id: job.id, title: job.title, score: job.score })) });
}

// Close notification
if (closeNotification) {
    closeNotification.onclick = () => {
        notificationModal.classList.remove('show');
        notificationModal.classList.add('scale-down');
        setTimeout(() => {
            notificationModal.style.display = 'none';
            notificationModal.classList.remove('scale-down');
        }, 300);
        logAction('closeNotification', {});
    };
}

// Close notification on outside click
if (notificationModal) {
    window.removeEventListener('click', handleOutsideClick);
    window.addEventListener('click', handleOutsideClick);
    function handleOutsideClick(event) {
        if (event.target === notificationModal) {
            notificationModal.classList.remove('show');
            notificationModal.classList.add('scale-down');
            setTimeout(() => {
                notificationModal.style.display = 'none';
                notificationModal.classList.remove('scale-down');
            }, 300);
            logAction('closeNotificationOutside', {});
        }
    }
}

// Close recommended modal
const closeRecommended = document.querySelector('.close-recommended');
if (closeRecommended) {
    closeRecommended.onclick = () => {
        recommendedModal.classList.remove('show');
        recommendedModal.classList.add('scale-down');
        setTimeout(() => {
            recommendedModal.style.display = 'none';
            recommendedModal.classList.remove('scale-down');
        }, 300);
        logAction('closeRecommendedModal', {});
    };
}

// Close recommended modal on outside click
if (recommendedModal) {
    window.removeEventListener('click', handleOutsideRecommendedClick);
    window.addEventListener('click', handleOutsideRecommendedClick);
    function handleOutsideRecommendedClick(event) {
        if (event.target === recommendedModal) {
            recommendedModal.classList.remove('show');
            recommendedModal.classList.add('scale-down');
            setTimeout(() => {
                recommendedModal.style.display = 'none';
                recommendedModal.classList.remove('scale-down');
            }, 300);
            logAction('closeRecommendedModalOutside', {});
        }
    }
}

// Get popular jobs in category
function getPopularJobsInCategory(category) {
    const clickData = JSON.parse(localStorage.getItem('jobClicksDetailed')) || [];
    const jobClickCounts = {};
    clickData.forEach(click => {
        if (click.category === category) {
            jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
        }
    });
    const sortedJobs = Object.keys(jobClickCounts)
        .sort((a, b) => jobClickCounts[b] - jobClickCounts[a])
        .map(id => {
            const job = jobs.find(job => job.id === parseInt(id));
            if (job) {
                job.clickCount = jobClickCounts[id];
                job.isPopular = true;
            }
            return job;
        })
        .filter(job => job);
    logAction('getPopularJobs', { category, popularJobs: sortedJobs.map(job => ({ id: job.id, clickCount: job.clickCount })) });
    return sortedJobs;
}

// Get most clicked category
function getMostClickedCategory() {
    const preferredCategory = localStorage.getItem('preferredCategory');
    if (preferredCategory) return preferredCategory;

    const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === currentUser.email);
    const userFeedback = user && user.feedback ? user.feedback : {};

    let maxCategory = "데이터 과학 및 분석";
    let maxScore = 0;
    for (let category in clickData) {
        let score = clickData[category] || 0;
        const categoryJobs = jobs.filter(job => job.category === category);
        categoryJobs.forEach(job => {
            if (userFeedback[job.id]) {
                score += userFeedback[job.id] === 'like' ? 2 : -1;
            }
        });
        if (score > maxScore) {
            maxScore = score;
            maxCategory = category;
        }
    }
    logAction('getMostClickedCategory', { category: maxCategory, score: maxScore });
    return maxCategory;
}

// Get top N clicked categories
function getTopClickedCategories(n) {
    const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === currentUser.email);
    const userFeedback = user && user.feedback ? user.feedback : {};

    const categoryScores = {};
    for (let category in clickData) {
        let score = clickData[category] || 0;
        const categoryJobs = jobs.filter(job => job.category === category);
        categoryJobs.forEach(job => {
            if (userFeedback[job.id]) {
                score += userFeedback[job.id] === 'like' ? 2 : -1;
            }
        });
        categoryScores[category] = score;
    }

    const sortedCategories = Object.keys(categoryScores)
        .sort((a, b) => categoryScores[b] - categoryScores[a])
        .slice(0, n);
    const result = sortedCategories.length > 0 ? sortedCategories : ["데이터 과학 및 분석"];
    logAction('getTopClickedCategories', { n, categories: result, scores: categoryScores });
    return result;
}

// handleAdvancedSearch
function handleAdvancedSearch(targetElement) {
    return restrictToLoggedIn(() => {
        const advancedSearchModal = document.getElementById('advanced-search-modal');
        const advancedSearchForm = document.getElementById('advanced-search-form');
        const advancedSearchBtn = document.getElementById(
            targetElement === document.getElementById('recommended-job-list')
                ? 'advanced-search-btn-main'
                : 'advanced-search-btn'
        );
        const closeAdvancedSearch = document.querySelector('.close-advanced-search');

        if (!advancedSearchModal || !advancedSearchBtn) {
            console.error('상세 검색 모달 또는 버튼을 찾을 수 없습니다.');
            return;
        }

        advancedSearchBtn.removeEventListener('click', openModalHandler);
        advancedSearchBtn.addEventListener('click', openModalHandler);
        function openModalHandler() {
            if (advancedSearchModal) {
                advancedSearchModal.classList.add('show');
                advancedSearchModal.classList.add('scale-up');
                logAction('openAdvancedSearch', {});
            }
        }

        if (closeAdvancedSearch) {
            closeAdvancedSearch.removeEventListener('click', closeModalHandler);
            closeAdvancedSearch.addEventListener('click', closeModalHandler);
            function closeModalHandler() {
                advancedSearchModal.classList.remove('show');
                advancedSearchModal.classList.add('scale-down');
                setTimeout(() => {
                    advancedSearchModal.style.display = 'none';
                    advancedSearchModal.classList.remove('scale-down');
                }, 300);
                logAction('closeAdvancedSearch', {});
            }
        }

        if (advancedSearchForm) {
            advancedSearchForm.removeEventListener('submit', submitHandler);
            advancedSearchForm.addEventListener('submit', submitHandler);
            function submitHandler(e) {
                e.preventDefault();
                const salaryDisclosed = document.getElementById('salary-disclosed')?.checked;
                const salaryMin = Math.max(0, parseInt(document.getElementById('salary-min')?.value) || 0);
                const salaryMax = parseInt(document.getElementById('salary-max')?.value) || Infinity;
                const remote = document.getElementById('remote-filter')?.value;
                const category = document.getElementById('category-filter')?.value;

                const users = JSON.parse(localStorage.getItem('users')) || [];
                const user = users.find(u => u.email === currentUser.email);
                const userFeedback = user && user.feedback ? user.feedback : {};

                const filteredJobs = jobs.map(job => {
                    let score = 0;
                    const salary = parseInt(job.salary.replace(/[^0-9]/g, '') || '0');
                    const matchesSalary = (!salaryDisclosed || job.salary !== '0') &&
                        (salary >= salaryMin) &&
                        (salary <= salaryMax);
                    const matchesRemote = remote === 'all' ||
                        (remote === 'true' && job.remote) ||
                        (remote === 'false' && !job.remote);
                    const matchesCategory = category === 'all' || job.category === category;
                    if (matchesSalary && matchesRemote && matchesCategory) {
                        score += 1;
                        if (userFeedback[job.id]) {
                            score += userFeedback[job.id] === 'like' ? 1 : -1;
                        }
                    } else {
                        score = -Infinity;
                    }
                    job.filterScore = score;
                    return job;
                }).filter(job => job.filterScore > 0);

                filteredJobs.sort((a, b) => {
                    const salaryA = parseInt(a.salary.replace(/[^0-9]/g, '') || '0');
                    const salaryB = parseInt(b.salary.replace(/[^0-9]/g, '') || '0');
                    return salaryB - salaryA || b.filterScore - a.filterScore;
                });

                targetElement.innerHTML = '';
                const fragment = document.createDocumentFragment();
                filteredJobs.forEach((job, index) => {
                    const jobDiv = document.createElement('div');
                    jobDiv.className = 'job-card hidden';
                    jobDiv.style.animationDelay = `${index * 0.1}s`;
                    jobDiv.innerHTML = `
                        <h3>${job.title} - ${job.company}</h3>
                        <p>연봉: ${job.salary}</p>
                        <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                        <p>필터 점수: ${job.filterScore.toFixed(2)}</p>
                        <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                    `;
                    const detailButton = jobDiv.querySelector('.detail-button');
                    detailButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        jobDiv.classList.add('clicked');
                        detailButton.classList.add('loading');
                        detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                        setTimeout(() => {
                            trackClick(job.category, job.id);
                            window.location.href = `job-detail.html?id=${job.id}`;
                        }, 500);
                    });
                    fragment.appendChild(jobDiv);

                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                entry.target.classList.remove('hidden');
                                entry.target.classList.add('fade-in');
                                observer.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.1 });
                    observer.observe(jobDiv);
                });

                targetElement.appendChild(fragment);
                advancedSearchModal.classList.remove('show');
                advancedSearchModal.classList.add('scale-down');
                setTimeout(() => {
                    advancedSearchModal.style.display = 'none';
                    advancedSearchModal.classList.remove('scale-down');
                }, 300);
                setTimeout(showRecommendedJob, 5000);
                logAction('submitAdvancedSearch', { salaryDisclosed, salaryMin, salaryMax, remote, category, resultsCount: filteredJobs.length });
            }
        }

        advancedSearchModal.addEventListener('click', (event) => {
            if (event.target === advancedSearchModal) {
                advancedSearchModal.classList.remove('show');
                advancedSearchModal.classList.add('scale-down');
                setTimeout(() => {
                    advancedSearchModal.style.display = 'none';
                    advancedSearchModal.classList.remove('scale-down');
                }, 300);
                logAction('closeAdvancedSearchOutside', {});
            }
        });

        ['salary-disclosed', 'salary-min', 'salary-max', 'remote-filter', 'category-filter'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => {
                    input.classList.add('active-filter');
                    logAction('updateFilter', { field: id, value: input.value });
                });
            }
        });
    }, false);
}

// 사용자 데이터 저장
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// checkLogin 함수 강화
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    return !!user;
}

// 모든 기능 호출 전 로그인 확인 헬퍼
function restrictToLoggedIn(callback, redirect = true) {
    if (!checkLogin()) {
        if (redirect && !window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'login.html';
            logAction('redirectToLogin', { from: window.location.pathname });
        }
        return false;
    }
    return callback();
}

// renderNavigation
// renderNavigation
function renderNavigation() {
  const navRight = document.querySelector('.nav-right');
  if (!navRight) {
      console.warn('nav-right 요소를 찾을 수 없습니다.');
      return;
  }

  const existingContainer = document.getElementById('auth-button-container');
  if (existingContainer) {
      existingContainer.remove();
  }

  const authButtonContainer = document.createElement('div');
  authButtonContainer.id = 'auth-button-container';
  navRight.appendChild(authButtonContainer); // insertBefore 대신 appendChild 사용

  console.log('Login Status:', checkLogin()); // 디버깅 로그 추가
  if (checkLogin()) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logout-btn';
      logoutBtn.className = 'detail-button';
      logoutBtn.textContent = '로그아웃';
      logoutBtn.addEventListener('click', () => {
          handleLogout();
          window.location.href = 'index.html';
          logAction('logout', {});
      });
      authButtonContainer.appendChild(logoutBtn);
  } else {
      const loginBtn = document.createElement('button');
      loginBtn.id = 'login-btn';
      loginBtn.className = 'detail-button';
      loginBtn.textContent = '로그인';
      loginBtn.addEventListener('click', () => {
          window.location.href = 'login.html';
          logAction('navigateToLogin', {});
      });
      authButtonContainer.appendChild(loginBtn);

      const signupBtn = document.createElement('button');
      signupBtn.id = 'signup-btn';
      signupBtn.className = 'detail-button';
      signupBtn.textContent = '회원가입';
      signupBtn.addEventListener('click', () => {
          window.location.href = 'signup.html';
          logAction('navigateToSignup', {});
      });
      authButtonContainer.appendChild(signupBtn);
  }
  logAction('renderNavigation', { isLoggedIn: checkLogin() });
}

// handleSignupPage
function handleSignupPage() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) {
        console.warn('signup-form 요소를 찾을 수 없습니다.');
        return;
    }
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmPasswordInput = document.getElementById('signup-confirm-password');
        const agreeTermsInput = document.getElementById('signup-agree-terms');
        if (!emailInput || !passwordInput || !confirmPasswordInput || !agreeTermsInput) {
            console.error('회원가입 입력 요소를 찾을 수 없습니다.');
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const agreeTerms = agreeTermsInput.checked;
        const result = handleSignup(email, password, confirmPassword, agreeTerms);
        if (result.success) {
            window.location.href = 'login.html';
            logAction('signupSuccess', { email });
        } else {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = result.message;
            errorMessage.style.color = '#e74c3c';
            signupForm.appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 3000);
            logAction('signupFailed', { email, error: result.message });
        }
    });
    logAction('viewSignupPage', {});
}

// handleLoginPage
function handleLoginPage() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) {
      console.warn('login-form 요소를 찾을 수 없습니다.');
      return;
  }
  loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      if (!emailInput || !passwordInput) {
          console.error('로그인 입력 요소를 찾을 수 없습니다.');
          return;
      }
      const email = emailInput.value.trim(); // 공백 제거
      const password = passwordInput.value.trim(); // 공백 제거
      console.log('로그인 시도:', { email, password }); // 디버깅 로그 추가
      if (handleLogin(email, password)) {
          window.location.href = 'index.html';
          logAction('loginSuccess', { email });
      } else {
          const errorMessage = document.createElement('p');
          errorMessage.textContent = '이메일 또는 비밀번호가 잘못되었습니다.';
          errorMessage.style.color = '#e74c3c';
          loginForm.appendChild(errorMessage);
          setTimeout(() => errorMessage.remove(), 3000);
          logAction('loginFailed', { email });
      }
  });
  logAction('viewLoginPage', {});
}

// handleLogin
function handleLogin(email, password) {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
      currentUser = { email: user.email, isAdmin: user.isAdmin || false };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      const userActivity = JSON.parse(localStorage.getItem('userActivity')) || {};
      if (!userActivity[email]) {
          userActivity[email] = [];
      }
      userActivity[email].push({ timestamp: new Date().toISOString() });
      localStorage.setItem('userActivity', JSON.stringify(userActivity));

      // 로그인 시 hasShownInitialModal 플래그 초기화
      localStorage.removeItem('hasShownInitialModal');
      console.log('hasShownInitialModal 플래그 초기화됨');

      logAction('login', { email });
      return true;
  }
  return false;
}

// handleLogout
function handleLogout() {
  const email = currentUser ? currentUser.email : 'anonymous';
  currentUser = null;
  localStorage.removeItem('currentUser');
  // 로그아웃 시 hasShownInitialModal 플래그 초기화
  localStorage.removeItem('hasShownInitialModal');
  console.log('hasShownInitialModal 플래그 초기화됨');
  logAction('logout', { email });
}

// handleSignup
function handleSignup(email, password, confirmPassword, agreeTerms) {
    if (password !== confirmPassword) {
        return { success: false, message: '비밀번호가 일치하지 않습니다.' };
    }
    if (!agreeTerms) {
        return { success: false, message: '약관에 동의해야 합니다.' };
    }
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.some(u => u.email === email)) {
        return { success: false, message: '이미 존재하는 이메일입니다.' };
    }
    users.push({ email, password, resume: null, preferredCategory: null, isAdmin: false });
    localStorage.setItem('users', JSON.stringify(users));
    return { success: true, message: '회원가입 성공! 로그인해 주세요.' };
}

// handleProfile
function handleProfile() {
    console.log('handleProfile - Starting execution');
    return restrictToLoggedIn(() => {
        console.log('handleProfile - User logged in:', currentUser);
        const preferredCategoriesList = document.getElementById('category-list');
        const selectedCategoriesList = document.getElementById('selected-categories-list');
        const recentJobs = document.getElementById('recent-jobs');
        const resumeForm = document.getElementById('resume-form');
        const resumeDisplay = document.getElementById('resume-display');
        const favoriteJobsList = document.getElementById('favorite-jobs-list');
        const savedResumeList = document.getElementById('saved-resume-list');
        const selectSkillsButton = document.getElementById('select-skills');
        const skillsModal = document.getElementById('skills-modal');
        const closeSkills = document.querySelector('.close-skills');
        const saveSkillsButton = document.getElementById('save-skills');
        const selectedSkillsDisplay = document.getElementById('selected-skills-display');
        const snsList = document.getElementById('sns-list');

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        console.log('handleProfile - Retrieved user:', user);

        if (!jobs || jobs.length === 0) {
            console.error('handleProfile - Jobs data not loaded');
            if (favoriteJobsList) {
                favoriteJobsList.innerHTML = '<p class="error-message">공고 데이터를 로드할 수 없습니다.</p>';
            }
            if (savedResumeList) {
                savedResumeList.innerHTML = '<p class="error-message">공고 데이터를 로드할 수 없습니다.</p>';
            }
            return;
        }

        if (preferredCategoriesList && selectedCategoriesList) {
            if (user && user.preferredCategories) {
                selectedCategoriesList.innerHTML = '';
                user.preferredCategories.forEach(category => {
                    const categoryItem = document.createElement('div');
                    categoryItem.className = 'category-item';
                    categoryItem.innerHTML = `
                        <span>${category}</span>
                    `;
                    selectedCategoriesList.appendChild(categoryItem);
                });

                const categoryButtons = preferredCategoriesList.querySelectorAll('.category-button');
                categoryButtons.forEach(btn => {
                    const category = btn.dataset.category;
                    if (user.preferredCategories.includes(category)) {
                        btn.classList.add('selected');
                    }
                });

                const removeButtons = document.querySelectorAll('.remove-category');
                removeButtons.forEach(btn => {
                    btn.removeEventListener('click', removeCategoryHandler);
                    btn.addEventListener('click', removeCategoryHandler);
                    function removeCategoryHandler() {
                        const category = btn.dataset.category;
                        user.preferredCategories = user.preferredCategories.filter(cat => cat !== category);
                        localStorage.setItem('users', JSON.stringify(users));
                        currentUser = { email: user.email, isAdmin: user.isAdmin || false, preferredCategories: user.preferredCategories };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        handleProfile();
                        displayMainRecommendedJobs();
                        logAction('removePreferredCategory', { category });
                    }
                });
            } else {
                selectedCategoriesList.innerHTML = '<p>선호 직군이 없습니다.</p>';
            }

            const categoryButtons = preferredCategoriesList.querySelectorAll('.category-button');
            categoryButtons.forEach(btn => {
                btn.removeEventListener('click', categoryButtonHandler);
                btn.addEventListener('click', categoryButtonHandler);
                function categoryButtonHandler() {
                    const category = btn.dataset.category;
                    user.preferredCategories = user.preferredCategories || [];
                    if (user.preferredCategories.includes(category)) {
                        user.preferredCategories = user.preferredCategories.filter(cat => cat !== category);
                        btn.classList.remove('selected');
                    } else {
                        user.preferredCategories.push(category);
                        btn.classList.add('selected');
                    }
                    localStorage.setItem('users', JSON.stringify(users));
                    currentUser = { email: user.email, isAdmin: user.isAdmin || false, preferredCategories: user.preferredCategories };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    handleProfile();
                    displayMainRecommendedJobs();
                    logAction('togglePreferredCategory', { category, added: user.preferredCategories.includes(category) });
                }
            });
        }

        if (selectSkillsButton && skillsModal && closeSkills && saveSkillsButton && selectedSkillsDisplay) {
            let selectedSkills = user && user.resume && user.resume.skills ? user.resume.skills : [];
            let otherSkills = user && user.resume && user.resume.skills && user.resume.skills.find(skill => skill.startsWith('기타:'))?.replace('기타: ', '') || '';

            selectSkillsButton.removeEventListener('click', openSkillsModal);
            selectSkillsButton.addEventListener('click', openSkillsModal);

            function openSkillsModal() {
                console.log('openSkillsModal - Attempting to open skills modal');
                if (!skillsModal) {
                    console.error('skills-modal 요소가 존재하지 않습니다.');
                    return;
                }
                skillsModal.style.display = 'block';
                skillsModal.classList.remove('closing');
                skillsModal.classList.add('show');
                console.log('openSkillsModal - Skills modal opened');

                const skillButtons = document.querySelectorAll('.skill-button');
                console.log('openSkillsModal - Found skill buttons:', skillButtons.length);
                if (skillButtons.length === 0) {
                    console.warn('skill-button 요소가 없습니다.');
                    return;
                }

                skillButtons.forEach(btn => {
                    btn.classList.remove('selected');
                    if (selectedSkills.includes(btn.dataset.skill)) {
                        btn.classList.add('selected');
                    }
                    btn.removeEventListener('click', skillButtonHandler);
                    btn.addEventListener('click', skillButtonHandler);

                    function skillButtonHandler() {
                        console.log('skillButtonHandler - Skill clicked:', btn.dataset.skill);
                        const skill = btn.dataset.skill;
                        if (selectedSkills.includes(skill)) {
                            selectedSkills = selectedSkills.filter(s => s !== skill);
                            btn.classList.remove('selected');
                        } else {
                            selectedSkills.push(skill);
                            btn.classList.add('selected');
                        }
                        logAction('toggleSkill', { skill, selected: selectedSkills.includes(skill) });
                    }
                });

                const otherSkillsInput = document.getElementById('other-skills-input');
                if (otherSkillsInput) {
                    otherSkillsInput.value = otherSkills;
                } else {
                    console.warn('other-skills-input 요소가 없습니다.');
                }
                logAction('openSkillsModal', {});
            }

            closeSkills.removeEventListener('click', closeSkillsModal);
            closeSkills.addEventListener('click', closeSkillsModal);

            function closeSkillsModal() {
                console.log('closeSkillsModal - Closing skills modal');
                skillsModal.classList.remove('show');
                skillsModal.classList.add('closing');
                setTimeout(() => {
                    skillsModal.style.display = 'none';
                    skillsModal.classList.remove('closing');
                }, 300);
                logAction('closeSkillsModal', {});
            }

            saveSkillsButton.removeEventListener('click', saveSkillsHandler);
            saveSkillsButton.addEventListener('click', saveSkillsHandler);

            function saveSkillsHandler() {
                console.log('saveSkillsHandler - Saving skills:', selectedSkills);
                const otherSkillsInput = document.getElementById('other-skills-input');
                if (otherSkillsInput) {
                    otherSkills = otherSkillsInput.value.trim();
                    if (otherSkills) {
                        selectedSkills = selectedSkills.filter(skill => !skill.startsWith('기타:'));
                        selectedSkills.push(`기타: ${otherSkills}`);
                    }
                }
                user.resume = user.resume || {};
                user.resume.skills = selectedSkills;
                localStorage.setItem('users', JSON.stringify(users));
                currentUser = { email: user.email, isAdmin: user.isAdmin || false, resume: user.resume };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                selectedSkillsDisplay.innerHTML = selectedSkills.length > 0 ? selectedSkills.join(', ') : '선택된 기술이 없습니다.';
                skillsModal.classList.remove('show');
                skillsModal.classList.add('closing');
                setTimeout(() => {
                    skillsModal.style.display = 'none';
                    skillsModal.classList.remove('closing');
                }, 300);
                logAction('saveSkills', { selectedSkills, otherSkills });
            }
        } else {
            console.warn('handleProfile - Skills modal elements not found:', {
                selectSkillsButton: !!selectSkillsButton,
                skillsModal: !!skillsModal,
                closeSkills: !!closeSkills,
                saveSkillsButton: !!saveSkillsButton,
                selectedSkillsDisplay: !!selectedSkillsDisplay
            });
        }

        if (recentJobs) {
            recentJobs.innerHTML = '<p class="loading-message">최근 조회 공고를 로드 중입니다...</p>';
            const clickData = JSON.parse(localStorage.getItem('jobClicksDetailed')) || [];
            const recentJobIds = [...new Set(clickData.map(click => click.jobId))].slice(0, 5);
            recentJobs.innerHTML = '';
            if (recentJobIds.length === 0) {
                recentJobs.innerHTML = '<p>최근 조회한 공고가 없습니다.</p>';
                return;
            }
            recentJobIds.forEach(jobId => {
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    const jobDiv = document.createElement('div');
                    jobDiv.className = 'job-card';
                    jobDiv.innerHTML = `
                        <h3>${job.title} - ${job.company}</h3>
                        <p class="highlight">연봉: ${job.salary}</p>
                        <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                        <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                    `;
                    jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                        e.preventDefault();
                        trackClick(job.category, job.id);
                        window.location.href = `job-detail.html?id=${job.id}`;
                    });
                    recentJobs.appendChild(jobDiv);
                }
            });
        }

        if (resumeForm && resumeDisplay && savedResumeList && snsList) {
            const addSnsButtons = document.querySelectorAll('.add-sns');
            addSnsButtons.forEach(btn => {
                btn.removeEventListener('click', addSnsHandler);
                btn.addEventListener('click', addSnsHandler);
                function addSnsHandler() {
                    const snsInputs = document.getElementById('sns-inputs');
                    const newSnsEntry = document.createElement('div');
                    newSnsEntry.className = 'sns-entry';
                    newSnsEntry.innerHTML = `
                        <select class="sns-type">
                            <option value="Email">Email</option>
                            <option value="GitHub">GitHub</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Blog">Blog</option>
                            <option value="Portfolio">Portfolio</option>
                        </select>
                        <input type="text" class="sns-input" data-sns-type="Email" placeholder="SNS/링크 입력">
                        <button type="button" class="remove-sns detail-button">제거</button>
                    `;
                    snsInputs.appendChild(newSnsEntry);
                    const removeSnsButton = newSnsEntry.querySelector('.remove-sns');
                    removeSnsButton.addEventListener('click', () => {
                        newSnsEntry.remove();
                        logAction('removeSns', {});
                    });

                    const snsTypeSelect = newSnsEntry.querySelector('.sns-type');
                    const snsInput = newSnsEntry.querySelector('.sns-input');
                    snsTypeSelect.addEventListener('change', () => {
                        snsInput.dataset.snsType = snsTypeSelect.value;
                        logAction('changeSnsType', { snsType: snsTypeSelect.value });
                    });
                    logAction('addSns', {});
                }
            });

            if (user && user.resume && user.resume.sns && user.resume.sns.length > 0) {
                snsList.innerHTML = '';
                user.resume.sns.forEach((sns, index) => {
                    const snsItem = document.createElement('div');
                    snsItem.className = 'sns-item';
                    snsItem.innerHTML = `
                        <span>${sns.type}: ${sns.value}</span>
                        <button class="edit-sns" data-index="${index}">수정</button>
                        <button class="delete-sns" data-index="${index}">삭제</button>
                    `;
                    snsList.appendChild(snsItem);
                });

                const editSnsButtons = document.querySelectorAll('.edit-sns');
                editSnsButtons.forEach(btn => {
                    btn.removeEventListener('click', editSnsHandler);
                    btn.addEventListener('click', editSnsHandler);
                    function editSnsHandler() {
                        const index = parseInt(btn.dataset.index);
                        const sns = user.resume.sns[index];
                        const newType = prompt('SNS 타입을 입력하세요 (Email, GitHub, LinkedIn, Blog, Portfolio):', sns.type);
                        const newValue = prompt('SNS/링크를 입력하세요:', sns.value);
                        if (newType && newValue) {
                            user.resume.sns[index] = { type: newType, value: newValue };
                            localStorage.setItem('users', JSON.stringify(users));
                            currentUser = { email: user.email, isAdmin: user.isAdmin || false, resume: user.resume };
                            localStorage.setItem('currentUser', JSON.stringify(currentUser));
                            handleProfile();
                            logAction('editSns', { index, newType, newValue });
                        }
                    }
                });

                const deleteSnsButtons = document.querySelectorAll('.delete-sns');
                deleteSnsButtons.forEach(btn => {
                    btn.removeEventListener('click', deleteSnsHandler);
                    btn.addEventListener('click', deleteSnsHandler);
                    function deleteSnsHandler() {
                        const index = parseInt(btn.dataset.index);
                        user.resume.sns.splice(index, 1);
                        localStorage.setItem('users', JSON.stringify(users));
                        currentUser = { email: user.email, isAdmin: user.isAdmin || false, resume: user.resume };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        handleProfile();
                        logAction('deleteSns', { index });
                    }
                });
            } else {
                snsList.innerHTML = '<p>추가된 SNS/링크가 없습니다.</p>';
            }

            resumeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const snsInputs = Array.from(document.querySelectorAll('.sns-input')).map(input => ({
                    type: input.dataset.snsType,
                    value: input.value.trim()
                })).filter(sns => sns.value);

                const resumeData = {
                    name: document.getElementById('resume-name').value,
                    email: document.getElementById('resume-email').value,
                    experience: document.getElementById('resume-experience').value,
                    skills: selectedSkills,
                    sns: snsInputs
                };
                user.resume = resumeData;
                localStorage.setItem('users', JSON.stringify(users));
                currentUser = { email: user.email, isAdmin: user.isAdmin || false, resume: user.resume };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                handleProfile();
                logAction('submitResume', { resumeData });
            });

            if (user && user.resume) {
                selectedSkillsDisplay.innerHTML = user.resume.skills.length > 0 ? user.resume.skills.join(', ') : '선택된 기술이 없습니다.';
                resumeDisplay.innerHTML = `
                    <h4>현재 이력서</h4>
                    <p><strong>이름:</strong> ${user.resume.name || '없음'}</p>
                    <p><strong>이메일:</strong> ${user.resume.email || '없음'}</p>
                    <p><strong>경력:</strong> ${user.resume.experience || '없음'}</p>
                    <p><strong>기술 및 자격:</strong> ${user.resume.skills && user.resume.skills.length > 0 ? user.resume.skills.join(', ') : '없음'}</p>
                    <p><strong>SNS/링크:</strong> ${user.resume.sns && user.resume.sns.length > 0 ? user.resume.sns.map(sns => `${sns.type}: ${sns.value}`).join(', ') : '없음'}</p>
                    <button id="delete-resume" class="detail-button">이력서 삭제</button>
                `;
                const deleteResume = document.getElementById('delete-resume');
                if (deleteResume) {
                    deleteResume.removeEventListener('click', deleteResumeHandler);
                    deleteResume.addEventListener('click', deleteResumeHandler);
                    function deleteResumeHandler() {
                        user.resume = null;
                        localStorage.setItem('users', JSON.stringify(users));
                        currentUser = { email: user.email, isAdmin: user.isAdmin || false };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        handleProfile();
                        logAction('deleteResume', {});
                    }
                }
                savedResumeList.innerHTML = `
                    <h4>저장된 이력서</h4>
                    <p><strong>이름:</strong> ${user.resume.name || '없음'}</p>
                    <p><strong>이메일:</strong> ${user.resume.email || '없음'}</p>
                    <p><strong>경력:</strong> ${user.resume.experience || '없음'}</p>
                    <p><strong>기술 및 자격:</strong> ${user.resume.skills && user.resume.skills.length > 0 ? user.resume.skills.join(', ') : '없음'}</p>
                    <p><strong>SNS/링크:</strong> ${user.resume.sns && user.resume.sns.length > 0 ? user.resume.sns.map(sns => `${sns.type}: ${sns.value}`).join(', ') : '없음'}</p>
                `;
            } else {
                selectedSkillsDisplay.innerHTML = '선택된 기술이 없습니다.';
                resumeDisplay.innerHTML = '<p>저장된 이력서가 없습니다.</p>';
                savedResumeList.innerHTML = '<p>저장된 이력서가 없습니다.</p>';
            }
        }

        if (favoriteJobsList) {
            console.log('handleProfile - Rendering favorite-jobs-list');
            favoriteJobsList.innerHTML = '<p class="loading-message">즐겨찾기 공고를 로드 중입니다...</p>';
            if (user && user.favorites && user.favorites.length > 0) {
                console.log('handleProfile - User favorites:', user.favorites);
                favoriteJobsList.innerHTML = '';
                user.favorites.forEach(jobId => {
                    const job = jobs.find(j => j.id === jobId);
                    if (job) {
                        console.log('handleProfile - Found job:', job);
                        const jobDiv = document.createElement('div');
                        jobDiv.className = 'job-card';
                        jobDiv.innerHTML = `
                            <h3>${job.title} - ${job.company}</h3>
                            <p class="highlight">연봉: ${job.salary}</p>
                            <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                            <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                            <button class="remove-favorite" data-job-id="${job.id}">즐겨찾기 제거</button>
                        `;
                        jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                            e.preventDefault();
                            trackClick(job.category, job.id);
                            window.location.href = `job-detail.html?id=${job.id}`;
                        });
                        favoriteJobsList.appendChild(jobDiv);
                    } else {
                        console.warn('handleProfile - Job not found for ID:', jobId);
                    }
                });
                const removeButtons = document.querySelectorAll('.remove-favorite');
                removeButtons.forEach(btn => {
                    btn.removeEventListener('click', removeFavoriteHandler);
                    btn.addEventListener('click', removeFavoriteHandler);
                    function removeFavoriteHandler() {
                        const jobId = parseInt(btn.dataset.jobId);
                        removeFavoriteJob(jobId);
                        logAction('removeFavorite', { jobId });
                    }
                });
            } else {
                console.log('handleProfile - No favorites found for user');
                favoriteJobsList.innerHTML = '<p>즐겨찾기에 추가된 공고가 없습니다.</p>';
            }
        } else {
            console.warn('handleProfile - favorite-jobs-list element not found');
        }

        logAction('viewProfile', {});
    });
}

// 관리자 계정 초기화
function initializeAdminAccount() {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (!users.some(u => u.email === 'choewj117@gmail.com')) {
            users.push({
                email: 'choewj117@gmail.com',
                password: 'admin123',
                resume: null,
                preferredCategory: null,
                isAdmin: true
            });
            localStorage.setItem('users', JSON.stringify(users));
            logAction('initializeAdminAccount', { email: 'choewj117@gmail.com' });
        }
    } catch (error) {
        console.error('관리자 계정 초기화 실패:', error);
    }
}

// handleAdminAuth
function handleAdminAuth() {
    const authModal = document.getElementById('auth-modal');
    const authSubmit = document.getElementById('auth-submit');
    const adminPassword = document.getElementById('admin-password');
    const authError = document.getElementById('auth-error');
    const analyticsSection = document.getElementById('analytics');
    if (authModal && authSubmit && adminPassword && analyticsSection) {
        if (!checkLogin() || !currentUser.isAdmin) {
            authModal.classList.add('show');
            analyticsSection.style.display = 'none';
            logAction('showAdminAuthModal', {});
        } else {
            analyticsSection.style.display = 'block';
            displayAnalytics();
        }
        authSubmit.addEventListener('click', () => {
            if (adminPassword.value === 'admin123' && checkLogin() && currentUser.isAdmin) {
                authModal.classList.remove('show');
                analyticsSection.style.display = 'block';
                displayAnalytics();
                logAction('adminAuthSuccess', {});
            } else {
                authError.style.display = 'block';
                logAction('adminAuthFailed', {});
            }
        });
        adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') authSubmit.click();
        });
    }
}

// displayAnalytics with improved PV handling
function displayAnalytics() {
  const pvTableBody = document.querySelector('#pv-table tbody');
  const pvChartCanvas = document.getElementById('pv-chart');
  const mauDauChartCanvas = document.getElementById('mau-dau-chart');
  const clickTableBody = document.querySelector('#click-table tbody');
  const companyJobsTableBody = document.querySelector('#company-jobs-table tbody');
  const userTableBody = document.querySelector('#user-table tbody');
  const jobTableBody = document.querySelector('#job-table tbody');
  const jobClicksTableBody = document.querySelector('#job-clicks-table tbody');
  const userAcquisitionTableBody = document.querySelector('#user-acquisition-table tbody');
  const retentionChartCanvas = document.getElementById('retention-chart');

  // 탭 기능 구현
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // 초기 탭 활성화 상태 확인 및 설정
  let activeTab = document.querySelector('.tab-button.active');
  if (!activeTab) {
      activeTab = tabButtons[0]; // 첫 번째 탭을 기본으로 활성화
      activeTab.classList.add('active');
  }
  const activeTabId = activeTab.getAttribute('data-tab');
  const activeContent = document.getElementById(activeTabId);
  if (activeContent) {
      activeContent.classList.add('active');
  } else {
      console.error(`Tab content for ${activeTabId} not found`);
  }

  tabButtons.forEach(button => {
      button.addEventListener('click', () => {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));

          button.classList.add('active');
          const tabId = button.getAttribute('data-tab');
          const tabContent = document.getElementById(tabId);
          if (tabContent) {
              tabContent.classList.add('active');
          } else {
              console.error(`Tab content for ${tabId} not found`);
          }

          console.log('Switched to tab:', tabId); // 디버깅 로그 추가
          logAction('switchTab', { tab: tabId });
      });
  });

  // PV 데이터 렌더링
  if (pvTableBody && pvChartCanvas) {
      let pvData = JSON.parse(localStorage.getItem('pageViews')) || {};
      console.log('PV Data in displayAnalytics:', pvData);

      pvTableBody.innerHTML = '';
      pvChartCanvas.style.display = 'block';

      if (Object.keys(pvData).length === 0) {
          pvTableBody.innerHTML = '<tr><td colspan="2">페이지 조회수 데이터가 없습니다.</td></tr>';
          pvChartCanvas.style.display = 'none';
          const message = document.createElement('p');
          message.textContent = '페이지 조회수 데이터가 없습니다.';
          message.style.color = '#e74c3c';
          pvChartCanvas.parentNode.insertBefore(message, pvChartCanvas);
      } else {
          const existingMessage = pvChartCanvas.parentNode.querySelector('p');
          if (existingMessage && existingMessage.textContent === '페이지 조회수 데이터가 없습니다.') {
              existingMessage.remove();
          }

          for (let page in pvData) {
              const row = document.createElement('tr');
              row.innerHTML = `<td>${page}</td><td>${pvData[page]}</td>`;
              pvTableBody.appendChild(row);
          }

          try {
              const existingPvChart = Chart.getChart(pvChartCanvas);
              if (existingPvChart) {
                  existingPvChart.destroy();
                  console.log('Existing PV chart destroyed');
              }

              const ctxPv = pvChartCanvas.getContext('2d');
              if (!ctxPv) {
                  console.error('Failed to get 2D context for pvChartCanvas');
                  return;
              }

              console.log('Rendering PV chart with data:', pvData);
              new Chart(ctxPv, {
                  type: 'bar',
                  data: {
                      labels: Object.keys(pvData),
                      datasets: [{
                          label: '페이지 조회수 (PV)',
                          data: Object.values(pvData),
                          backgroundColor: 'rgba(54, 162, 235, 0.6)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1
                      }]
                  },
                  options: {
                      scales: {
                          y: { beginAtZero: true, title: { display: true, text: '조회수' } },
                          x: { title: { display: true, text: '페이지' } }
                      }
                  }
              });
              console.log('PV chart rendered successfully');
          } catch (error) {
              console.error('Error rendering PV chart:', error);
          }
      }
  } else {
      console.error('pvTableBody or pvChartCanvas not found in DOM');
  }

  // MAU/DAU 데이터 렌더링
  if (mauDauChartCanvas) {
      const userActivity = JSON.parse(localStorage.getItem('userActivity')) || {};
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneMonth = 30 * oneDay;

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let dauCount = 0;
      const dailyUsers = new Set();
      for (let email in userActivity) {
          const activities = userActivity[email] || [];
          const todayActivity = activities.find(activity => {
              if (!activity || !activity.timestamp) return false;
              const activityDate = new Date(activity.timestamp);
              return activityDate.getFullYear() === today.getFullYear() &&
                     activityDate.getMonth() === today.getMonth() &&
                     activityDate.getDate() === today.getDate();
          });
          if (todayActivity) dailyUsers.add(email);
      }
      dauCount = dailyUsers.size;

      let mauCount = 0;
      const monthlyUsers = new Set();
      for (let email in userActivity) {
          const activities = userActivity[email] || [];
          const recentActivity = activities.find(activity => {
              if (!activity || !activity.timestamp) return false;
              const activityDate = new Date(activity.timestamp);
              return (now - activityDate) <= oneMonth;
          });
          if (recentActivity) monthlyUsers.add(email);
      }
      mauCount = monthlyUsers.size;

      const existingMauDauChart = Chart.getChart(mauDauChartCanvas);
      if (existingMauDauChart) existingMauDauChart.destroy();

      const ctxMauDau = mauDauChartCanvas.getContext('2d');
      new Chart(ctxMauDau, {
          type: 'bar',
          data: {
              labels: ['DAU', 'MAU'],
              datasets: [{
                  label: '사용자 활동',
                  data: [dauCount, mauCount],
                  backgroundColor: [
                      'rgba(255, 99, 132, 0.6)',
                      'rgba(75, 192, 192, 0.6)'
                  ],
                  borderColor: [
                      'rgba(255, 99, 132, 1)',
                      'rgba(75, 192, 192, 1)'
                  ],
                  borderWidth: 1
              }]
          },
          options: {
              scales: {
                  y: { beginAtZero: true, title: { display: true, text: '사용자 수' } },
                  x: { title: { display: true, text: '지표' } }
              }
          }
      });
  }

  // 사용자 유입 경로 데이터 렌더링
  if (userAcquisitionTableBody) {
      const userActivity = JSON.parse(localStorage.getItem('userActivity')) || {};
      userAcquisitionTableBody.innerHTML = '';
      if (Object.keys(userActivity).length === 0) {
          userAcquisitionTableBody.innerHTML = '<tr><td colspan="3">사용자 활동 데이터가 없습니다.</td></tr>';
      } else {
          for (let email in userActivity) {
              const activities = userActivity[email] || [];
              if (activities.length === 0) continue;
              const firstActivity = activities[0]; // 첫 번째 활동 (최초 방문)
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${email}</td>
                  <td>${firstActivity.page || '알 수 없음'}</td>
                  <td>${firstActivity.timestamp ? new Date(firstActivity.timestamp).toLocaleString() : '알 수 없음'}</td>
              `;
              userAcquisitionTableBody.appendChild(row);
          }
      }
  }

  // 리텐션율 데이터 렌더링
  if (retentionChartCanvas) {
      const userActivity = JSON.parse(localStorage.getItem('userActivity')) || {};
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const sevenDaysAgo = new Date(now - 7 * oneDay);

      // 사용자별 활동 분석
      const retentionData = [];
      for (let i = 0; i < 7; i++) {
          const date = new Date(sevenDaysAgo.getTime() + i * oneDay);
          const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          let totalUsers = 0;
          let retainedUsers = 0;

          for (let email in userActivity) {
              const activities = userActivity[email] || [];
              const firstActivity = activities.find(activity => {
                  if (!activity || !activity.timestamp) return false;
                  const activityDate = new Date(activity.timestamp);
                  return activityDate.getFullYear() === date.getFullYear() &&
                         activityDate.getMonth() === date.getMonth() &&
                         activityDate.getDate() === date.getDate();
              });

              if (firstActivity) {
                  totalUsers++;
                  const hasReturned = activities.some(activity => {
                      if (!activity || !activity.timestamp) return false;
                      const activityDate = new Date(activity.timestamp);
                      return activityDate > firstActivity.timestamp &&
                             (activityDate - new Date(firstActivity.timestamp)) <= 7 * oneDay;
                  });
                  if (hasReturned) retainedUsers++;
              }
          }

          const retentionRate = totalUsers > 0 ? (retainedUsers / totalUsers) * 100 : 0;
          retentionData.push(retentionRate);
      }

      const existingRetentionChart = Chart.getChart(retentionChartCanvas);
      if (existingRetentionChart) existingRetentionChart.destroy();

      const ctxRetention = retentionChartCanvas.getContext('2d');
      new Chart(ctxRetention, {
          type: 'line',
          data: {
              labels: Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`),
              datasets: [{
                  label: '7일 리텐션율 (%)',
                  data: retentionData,
                  borderColor: 'rgba(75, 192, 192, 1)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  fill: true,
                  tension: 0.3
              }]
          },
          options: {
              scales: {
                  y: { 
                      beginAtZero: true, 
                      max: 100,
                      title: { display: true, text: '리텐션율 (%)' }
                  },
                  x: { title: { display: true, text: '기간' } }
              }
          }
      });
  }

  // 직군별 클릭 수 데이터 렌더링
  if (clickTableBody) {
      const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
      clickTableBody.innerHTML = '';
      if (Object.keys(clickData).length === 0) {
          clickTableBody.innerHTML = '<tr><td colspan="2">직군 클릭 데이터가 없습니다.</td></tr>';
      } else {
          for (let category in clickData) {
              const row = document.createElement('tr');
              row.innerHTML = `<td>${category}</td><td>${clickData[category]}</td>`;
              clickTableBody.appendChild(row);
          }
      }
  }

  // 회사별 공고 수 데이터 렌더링
  if (companyJobsTableBody) {
      const companyJobCounts = {};
      jobs.forEach(job => {
          companyJobCounts[job.company] = (companyJobCounts[job.company] || 0) + 1;
      });

      companyJobsTableBody.innerHTML = '';
      if (Object.keys(companyJobCounts).length === 0) {
          companyJobsTableBody.innerHTML = '<tr><td colspan="2">회사별 공고 데이터가 없습니다.</td></tr>';
      } else {
          for (let company in companyJobCounts) {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${company}</td>
                  <td>${companyJobCounts[company]}</td>
              `;
              companyJobsTableBody.appendChild(row);
          }
      }
  }

  // 공고별 클릭 횟수 데이터 렌더링
  if (jobClicksTableBody) {
      const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
      const jobClickCounts = {};
      allUsersClicks.forEach(click => {
          jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
      });

      jobClicksTableBody.innerHTML = '';
      if (Object.keys(jobClickCounts).length === 0) {
          jobClicksTableBody.innerHTML = '<tr><td colspan="4">공고 클릭 데이터가 없습니다.</td></tr>';
      } else {
          for (let jobId in jobClickCounts) {
              const job = jobs.find(j => j.id === parseInt(jobId));
              if (job) {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                      <td>${job.id}</td>
                      <td>${job.title}</td>
                      <td>${job.company}</td>
                      <td>${jobClickCounts[jobId]}</td>
                  `;
                  jobClicksTableBody.appendChild(row);
              }
          }
      }
  }

  // 사용자 관리 데이터 렌더링
  if (userTableBody) {
      const users = JSON.parse(localStorage.getItem('users')) || [];
      userTableBody.innerHTML = '';
      if (users.length === 0) {
          userTableBody.innerHTML = '<tr><td colspan="4">사용자 데이터가 없습니다.</td></tr>';
      } else {
          users.forEach(user => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${user.email}</td>
                  <td>${user.preferredCategory || '없음'}</td>
                  <td>${user.resume ? '있음' : '없음'}</td>
                  <td><button class="delete-user" data-email="${user.email}">삭제</button></td>
              `;
              userTableBody.appendChild(row);
          });

          document.querySelectorAll('.delete-user').forEach(btn => {
              btn.addEventListener('click', () => {
                  const email = btn.dataset.email;
                  let users = JSON.parse(localStorage.getItem('users')) || [];
                  users = users.filter(u => u.email !== email);
                  localStorage.setItem('users', JSON.stringify(users));
                  displayAnalytics();
                  logAction('deleteUser', { email });
              });
          });
      }
  }

  // 공고 관리 데이터 렌더링
  if (jobTableBody) {
      jobTableBody.innerHTML = '';
      if (jobs.length === 0) {
          jobTableBody.innerHTML = '<tr><td colspan="5">공고 데이터가 없습니다.</td></tr>';
      } else {
          jobs.forEach(job => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${job.id}</td>
                  <td>${job.title}</td>
                  <td>${job.category}</td>
                  <td>${job.company}</td>
                  <td><button class="delete-job" data-id="${job.id}">삭제</button></td>
              `;
              jobTableBody.appendChild(row);
          });

          document.querySelectorAll('.delete-job').forEach(btn => {
              btn.addEventListener('click', () => {
                  const id = parseInt(btn.dataset.id);
                  deleteJob(id);
                  displayAnalytics();
                  logAction('deleteJob', { jobId: id });
              });
          });
      }
  }

  logAction('viewAnalytics', {});
}

// 오류 처리 헬퍼 함수
function handleError(message, elementId) {
    console.error(message);
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<p class="error-message">${message}</p>`;
    }
    logAction('error', { message, elementId });
}

// displayMainRecommendedJobs
function displayMainRecommendedJobs() {
  return restrictToLoggedIn(() => {
      const recommendedJobList = document.getElementById('recommended-job-list');
      if (!recommendedJobList) {
          console.error('recommended-job-list 요소를 찾을 수 없습니다.');
          return;
      }

      recommendedJobList.innerHTML = '<p class="loading-message">추천 공고를 로드 중입니다...</p>';
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === currentUser.email);
      let preferredCategories = user && user.preferredCategories ? user.preferredCategories : [];

      // 선호 직군이 없는 경우 기본 메시지 표시
      if (preferredCategories.length === 0) {
          recommendedJobList.innerHTML = '<p>프로필에서 선호 직군을 설정해 주세요.</p>';
          logAction('viewMainRecommendedJobs', { message: '선호 직군 없음' });
          return;
      }

      // 모든 선호 직군의 공고를 수집하고 인기순 정렬
      let allJobs = [];
      preferredCategories.forEach(category => {
          const categoryJobs = jobs.filter(job => job.category === category);
          allJobs = allJobs.concat(categoryJobs);
      });

      // 공고별 클릭 수 계산 (인기순 정렬)
      const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
      const jobClickCounts = {};
      allUsersClicks.forEach(click => {
          jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
      });

      const sortedJobs = allJobs
          .map(job => ({
              ...job,
              clickCount: jobClickCounts[job.id] || 0
          }))
          .sort((a, b) => b.clickCount - a.clickCount);

      // 반응형 공고 갯수 설정
      let jobsPerSlide;
      if (window.innerWidth <= 480) {
          jobsPerSlide = 2; // 작은 화면: 2개 공고
      } else if (window.innerWidth <= 768) {
          jobsPerSlide = 4; // 중간 화면: 4개 공고
      } else {
          jobsPerSlide = 6; // 큰 화면: 6개 공고
      }

      // 슬라이더 구조 생성
      recommendedJobList.innerHTML = `
          <div class="slider-container">
              <button class="slider-prev">◀</button>
              <div class="slider">
                  <div class="slider-wrapper" id="slider-wrapper"></div>
              </div>
              <button class="slider-next">▶</button>
          </div>
      `;
      const sliderWrapper = document.getElementById('slider-wrapper');

      // 슬라이드 단위로 공고 분배
      let currentSlide = 0;
      const slides = [];

      for (let i = 0; i < sortedJobs.length; i += jobsPerSlide) {
          const slideJobs = sortedJobs.slice(i, i + jobsPerSlide);
          if (slideJobs.length === 0) continue;

          const slide = document.createElement('div');
          slide.className = 'slide';
          slide.style.left = `${slides.length * 100}%`; // 각 슬라이드 위치 설정
          slide.innerHTML = `
              <div class="slide-jobs job-grid"></div>
          `;
          const jobGrid = slide.querySelector('.slide-jobs');

          slideJobs.forEach((job, jobIndex) => {
              const jobDiv = document.createElement('div');
              jobDiv.className = 'job-card hidden';
              jobDiv.style.animationDelay = `${jobIndex * 0.1}s`;
              jobDiv.innerHTML = `
                  <h3>${job.title} - ${job.company}</h3>
                  <p class="highlight">연봉: ${job.salary}</p>
                  <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                  <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
              `;
              const detailButton = jobDiv.querySelector('.detail-button');
              detailButton.addEventListener('click', (e) => {
                  e.preventDefault();
                  jobDiv.classList.add('clicked');
                  detailButton.classList.add('loading');
                  detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                  setTimeout(() => {
                      trackClick(job.category, job.id);
                      window.location.href = `job-detail.html?id=${job.id}`;
                  }, 500);
              });
              jobGrid.appendChild(jobDiv);

              const observer = new IntersectionObserver((entries) => {
                  entries.forEach(entry => {
                      if (entry.isIntersecting) {
                          entry.target.classList.remove('hidden');
                          entry.target.classList.add('fade-in');
                          observer.unobserve(entry.target);
                      }
                  });
              }, { threshold: 0.1 });
              observer.observe(jobDiv);
          });

          sliderWrapper.appendChild(slide);
          slides.push(slide);
      }

      // 슬라이더가 없으면 메시지 표시
      if (slides.length === 0) {
          recommendedJobList.innerHTML = '<p>선호 직군에 해당하는 공고가 없습니다.</p>';
          logAction('viewMainRecommendedJobs', { message: '추천 공고 없음' });
          return;
      }

      // 슬라이더 컨트롤러
      const prevButton = recommendedJobList.querySelector('.slider-prev');
      const nextButton = recommendedJobList.querySelector('.slider-next');

      function updateSlider() {
          sliderWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
          prevButton.disabled = currentSlide === 0;
          nextButton.disabled = currentSlide >= slides.length - 1;
          console.log('Current Slide:', currentSlide, 'Total Slides:', slides.length);
      }

      prevButton.addEventListener('click', () => {
          if (currentSlide > 0) {
              currentSlide--;
              updateSlider();
              logAction('slideRecommendedJobs', { direction: 'prev', slide: currentSlide });
          }
      });

      nextButton.addEventListener('click', () => {
          if (currentSlide < slides.length - 1) {
              currentSlide++;
              updateSlider();
              logAction('slideRecommendedJobs', { direction: 'next', slide: currentSlide });
          }
      });

      // 창 크기 변경 시 슬라이드 갯수 재조정
      window.addEventListener('resize', () => {
          displayMainRecommendedJobs(); // 창 크기 변경 시 함수 재호출
      });

      updateSlider();
      logAction('viewMainRecommendedJobs', { slideCount: slides.length, totalJobs: sortedJobs.length });
  });
}


// showRecommendedJobsModal
// showRecommendedJobsModal 함수 수정
function showRecommendedJobsModal() {
  return restrictToLoggedIn(() => {
      const recommendedModal = document.getElementById('preferred-recommended-modal');
      const recommendedJobs = document.getElementById('preferred-recommended-jobs');
      const closeRecommended = document.querySelector('.close-preferred-recommended');

      if (!recommendedModal || !recommendedJobs) {
          console.warn('showRecommendedJobsModal - preferred-recommended-modal 또는 preferred-recommended-jobs 요소를 찾을 수 없습니다.');
          return;
      }

      // 처음 로그인 여부 확인
      const hasShownInitialModal = localStorage.getItem('hasShownInitialModal');
      if (hasShownInitialModal === 'true') {
          console.log('이미 처음 로그인 시 모달을 표시했습니다.');
          return; // 이미 모달을 표시했다면 함수 종료
      }

      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === currentUser.email);
      if (!user) {
          console.warn('사용자 정보를 찾을 수 없습니다:', currentUser.email);
          return;
      }

      let preferredCategories = user && user.preferredCategories ? user.preferredCategories : [];
      let userSkills = user && user.resume && user.resume.skills ? user.resume.skills : [];
      let userExperience = user && user.resume && user.resume.experience ? parseInt(user.resume.experience) || 0 : 0;

      const userLogs = JSON.parse(localStorage.getItem('userLogs')) || [];
      const userClickLogs = userLogs.filter(log => log.email === currentUser.email && log.action === 'clickJob');
      const recentJobIds = [...new Set(userClickLogs.map(log => log.details.jobId))].slice(0, 5);
      const clickedCategories = [...new Set(userClickLogs.map(log => log.details.category))];
      const userApplyLogs = userLogs.filter(log => log.email === currentUser.email && log.action === 'applyJob');
      const appliedCategories = [...new Set(userApplyLogs.map(log => {
          const job = jobs.find(j => j.id === log.details.jobId);
          return job ? job.category : null;
      }).filter(cat => cat))];
      preferredCategories = [...new Set([...preferredCategories, ...clickedCategories, ...appliedCategories])];

      const userActivityTimes = userLogs
          .filter(log => log.email === currentUser.email)
          .map(log => new Date(log.timestamp).getHours());
      const activeHour = userActivityTimes.length > 0
          ? Math.round(userActivityTimes.reduce((sum, hour) => sum + hour, 0) / userActivityTimes.length)
          : 12;
      const currentHour = new Date().getHours();
      const delay = Math.abs(currentHour - activeHour) < 3 ? 5000 : 15000;

      // 지연 시간 제거, 즉시 실행
      user.feedback = user.feedback || {};
      const userFeedback = user.feedback;

      let recommendedJobsList = [];
      jobs.forEach(job => {
          if (recentJobIds.includes(job.id)) return;

          let score = 0;
          if (preferredCategories.includes(job.category)) {
              score += 3;
          }

          const requiredSkills = job.requirements || [];
          const matchedSkills = requiredSkills.filter(skill => userSkills.includes(skill));
          score += (matchedSkills.length * 2);

          const requiredExperience = job.experience ? parseInt(job.experience) || 0 : 0;
          if (userExperience >= requiredExperience) {
              score += 1;
          }

          if (job.remote) {
              score += 1;
          }

          const salary = parseInt(job.salary.replace(/[^0-9]/g, '') || '0');
          score += (salary / 10000000) * 0.5;

          if (appliedCategories.includes(job.category)) {
              score += 2;
          }

          if (userFeedback[job.id]) {
              score += userFeedback[job.id] === 'like' ? 1 : -1;
          }

          job.score = score;
          recommendedJobsList.push(job);
      });

      recommendedJobsList = recommendedJobsList
          .sort((a, b) => b.score - a.score)
          .slice(0, Math.max(5, Math.min(10, recommendedJobsList.length)));

      recommendedJobs.innerHTML = '';
      if (recommendedJobsList.length > 0) {
          recommendedJobsList.forEach((job, index) => {
              if (job) {
                  const jobDiv = document.createElement('div');
                  jobDiv.className = 'job-card hidden';
                  jobDiv.style.animationDelay = `${index * 0.1}s`;
                  jobDiv.innerHTML = `
                      <h3>${job.title} - ${job.company}</h3>
                      <p class="highlight">연봉: ${job.salary}</p>
                      <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                      <p>추천 점수: ${job.score.toFixed(2)}</p>
                      <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                      <button class="feedback-like" data-job-id="${job.id}">${userFeedback[job.id] === 'like' ? '❤️ 좋아요' : '좋아요'}</button>
                      <button class="feedback-dislike" data-job-id="${job.id}">${userFeedback[job.id] === 'dislike' ? '👎 싫어요' : '싫어요'}</button>
                  `;
                  const detailButton = jobDiv.querySelector('.detail-button');
                  detailButton.addEventListener('click', (e) => {
                      e.preventDefault();
                      jobDiv.classList.add('clicked');
                      detailButton.classList.add('loading');
                      detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                      setTimeout(() => {
                          trackClick(job.category, job.id);
                          window.location.href = `job-detail.html?id=${job.id}`;
                      }, 500);
                  });
                  const likeButton = jobDiv.querySelector('.feedback-like');
                  likeButton.addEventListener('click', () => {
                      likeButton.classList.add('animate-like');
                      userFeedback[job.id] = 'like';
                      localStorage.setItem('users', JSON.stringify(users));
                      currentUser.feedback = userFeedback;
                      localStorage.setItem('currentUser', JSON.stringify(currentUser));
                      showRecommendedJobsModal();
                      logAction('feedbackLike', { jobId: job.id });
                  });
                  const dislikeButton = jobDiv.querySelector('.feedback-dislike');
                  dislikeButton.addEventListener('click', () => {
                      dislikeButton.classList.add('animate-dislike');
                      userFeedback[job.id] = 'dislike';
                      localStorage.setItem('users', JSON.stringify(users));
                      currentUser.feedback = userFeedback;
                      localStorage.setItem('currentUser', JSON.stringify(currentUser));
                      showRecommendedJobsModal();
                      logAction('feedbackDislike', { jobId: job.id });
                  });
                  recommendedJobs.appendChild(jobDiv);

                  const observer = new IntersectionObserver((entries) => {
                      entries.forEach(entry => {
                          if (entry.isIntersecting) {
                              entry.target.classList.remove('hidden');
                              entry.target.classList.add('fade-in');
                              observer.unobserve(entry.target);
                          }
                      });
                  }, { threshold: 0.1 });
                  observer.observe(jobDiv);
              }
          });

          recommendedModal.classList.add('show');
          recommendedModal.classList.add('scale-up');
          recommendedModal.style.display = 'block';

          window.removeEventListener('click', handleRecommendedModalClick);
          window.addEventListener('click', handleRecommendedModalClick);

          function handleRecommendedModalClick(event) {
              if (event.target === recommendedModal) {
                  recommendedModal.classList.remove('show');
                  recommendedModal.classList.add('scale-down');
                  setTimeout(() => {
                      recommendedModal.style.display = 'none';
                      recommendedModal.classList.remove('scale-down');
                      window.removeEventListener('click', handleRecommendedModalClick);
                  }, 300);
                  logAction('closeRecommendedModalOutside', {});
              }
          }

          if (closeRecommended) {
              closeRecommended.removeEventListener('click', handleCloseRecommendedModal);
              closeRecommended.addEventListener('click', handleCloseRecommendedModal);
          }

          function handleCloseRecommendedModal() {
              recommendedModal.classList.remove('show');
              recommendedModal.classList.add('scale-down');
              setTimeout(() => {
                  recommendedModal.style.display = 'none';
                  recommendedModal.classList.remove('scale-down');
                  window.removeEventListener('click', handleRecommendedModalClick);
              }, 300);
              logAction('closeRecommendedModal', {});
          }

          localStorage.setItem('hasShownInitialModal', 'true');
      } else {
          console.log('추천 공고가 없습니다.');
      }

      logAction('showRecommendedJobsModal', {
          jobCount: recommendedJobsList.length,
          recommendedJobIds: recommendedJobsList.map(job => job.id),
          delay: 0 // 지연 시간 제거
      });
  });
}

// removeFavoriteJob
function removeFavoriteJob(jobId) {
    return restrictToLoggedIn(() => {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        if (!user) {
            console.error('현재 사용자를 찾을 수 없습니다.');
            return;
        }
        user.favorites = user.favorites || [];
        user.favorites = user.favorites.filter(id => id !== jobId);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = { email: user.email, isAdmin: user.isAdmin || false, favorites: user.favorites };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('removeFavoriteJob - Updated currentUser:', currentUser);
        console.log('removeFavoriteJob - Updated users:', users);

        const favoriteButton = document.querySelector(`.favorite-button[data-job-id="${jobId}"]`);
        if (favoriteButton) {
            favoriteButton.classList.remove('favorited');
            favoriteButton.innerHTML = '즐겨찾기 추가';
        }

        handleProfile();
        logAction('removeFavorite', { jobId });
    });
}

// removePreferredCategory
function removePreferredCategory(category) {
    return restrictToLoggedIn(() => {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === currentUser.email);
        if (!user) {
            console.error('현재 사용자를 찾을 수 없습니다.');
            return;
        }
        user.preferredCategories = user.preferredCategories || [];
        user.preferredCategories = user.preferredCategories.filter(cat => cat !== category);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = { email: user.email, isAdmin: user.isAdmin || false, preferredCategories: user.preferredCategories };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        handleProfile();
        logAction('removePreferredCategory', { category });
    });
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  const currentPath = window.location.pathname;
  if (currentPath === '/') {
      if (checkLogin()) {
          window.location.href = 'index.html';
      } else {
          window.location.href = 'login.html';
      }
      logAction('rootRedirect', { to: checkLogin() ? 'index.html' : 'login.html' });
      return;
  }

  initializeAdminAccount();
  const loadedJobs = await loadJobs();
  if (!loadedJobs || loadedJobs.length === 0) {
      console.error('DOMContentLoaded - Failed to load jobs:', loadedJobs);
      handleError('공고 데이터를 로드할 수 없습니다.', 'job-detail');
      handleError('공고 데이터를 로드할 수 없습니다.', 'job-listings');
      handleError('공고 데이터를 로드할 수 없습니다.', 'favorite-jobs-list');
      return;
  }
  console.log('DOMContentLoaded - Loaded jobs:', jobs);

  const navRight = document.querySelector('.nav-right');
  if (navRight) {
      renderNavigation();
  } else {
      console.warn('DOMContentLoaded - nav-right 요소가 없으므로 renderNavigation을 스킵합니다.');
  }

  if (document.getElementById('login-form')) {
      trackPageView('Login Page');
      handleLoginPage();
      return;
  }

  if (document.getElementById('signup-form')) {
      trackPageView('Signup Page');
      handleSignupPage();
      return;
  }

  if (document.getElementById('profile')) {
      trackPageView('Profile Page');
      console.log('DOMContentLoaded - Calling handleProfile');
      handleProfile();
      return;
  }

  if (document.getElementById('recommended-job-list')) {
      restrictToLoggedIn(() => {
          trackPageView('Main Page');
          displayMainRecommendedJobs();
          handleAdvancedSearch(document.getElementById('recommended-job-list'));

          const searchInputMain = document.getElementById('search-input-main');
          if (searchInputMain) {
              searchInputMain.addEventListener('input', (e) => {
                  searchJobs(e.target.value, document.getElementById('recommended-job-list'));
                  if (typeof showRecommendedJobsModal === 'function') {
                      showRecommendedJobsModal(); // 지연 시간 제거
                  } else {
                      console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
                      logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
                  }
              });
          }

          const heroSearchInput = document.getElementById('hero-search-input');
          const heroSearchBtn = document.getElementById('hero-search-btn');
          if (heroSearchInput && heroSearchBtn) {
              heroSearchBtn.addEventListener('click', () => {
                  searchJobs(heroSearchInput.value, document.getElementById('recommended-job-list'));
                  if (typeof showRecommendedJobsModal === 'function') {
                      showRecommendedJobsModal(); // 지연 시간 제거
                  } else {
                      console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
                      logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
                  }
              });
              heroSearchInput.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                      heroSearchBtn.click();
                  }
              });
          }

          const recommendedModal = document.getElementById('preferred-recommended-modal');
          if (recommendedModal) {
              if (typeof showRecommendedJobsModal === 'function') {
                  showRecommendedJobsModal(); // 지연 시간 제거
              } else {
                  console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
                  logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
              }
          }

          if (typeof showRecommendedJobsModal === 'function') {
              showRecommendedJobsModal(); // 지연 시간 제거
          } else {
              console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
              logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
          }

          displayRealTimeNews();

          const popularJobList = document.getElementById('popular-job-list');
          if (popularJobList) {
              popularJobList.innerHTML = '<p class="loading-message">인기 공고 로드 중...</p>';
              
              if (!jobs || jobs.length === 0) {
                  console.error('인기 공고 로드 실패: jobs 데이터가 없습니다.');
                  popularJobList.innerHTML = '<p class="error-message">인기 공고를 로드할 수 없습니다.</p>';
                  logAction('error', { message: '인기 공고 로드 실패: jobs 데이터 없음', elementId: 'popular-job-list' });
                  return;
              }

              const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
              const jobClickCounts = {};
              allUsersClicks.forEach(click => {
                  jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
              });

              let popularJobs = [];
              if (Object.keys(jobClickCounts).length > 0) {
                  popularJobs = Object.keys(jobClickCounts)
                      .sort((a, b) => jobClickCounts[b] - jobClickCounts[a])
                      .slice(0, 6)
                      .map(jobId => jobs.find(job => job && job.id === parseInt(jobId)))
                      .filter(job => job);
              }

              if (popularJobs.length === 0) {
                  popularJobs = jobs.slice(0, 3);
                  console.log('인기 공고: 클릭 데이터 없음, 기본 공고 표시');
              }

              popularJobList.innerHTML = '';
              popularJobs.forEach((job, index) => {
                  const jobDiv = document.createElement('div');
                  jobDiv.className = `job-card hidden${job.isPopular ? ' popular' : ''}`;
                  jobDiv.style.animationDelay = `${index * 0.1}s`;
                  jobDiv.innerHTML = `
                      <h3>${job.title} - ${job.company}</h3>
                      <p>연봉: ${job.salary}</p>
                      <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                      <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                  `;
                  const detailButton = jobDiv.querySelector('.detail-button');
                  detailButton.addEventListener('click', (e) => {
                      e.preventDefault();
                      jobDiv.classList.add('clicked');
                      detailButton.classList.add('loading');
                      detailButton.innerHTML = '<span class="spinner"></span> 로드 중...';
                      setTimeout(() => {
                          trackClick(job.category, job.id);
                          window.location.href = `job-detail.html?id=${job.id}`;
                      }, 500);
                  });
                  popularJobList.appendChild(jobDiv);

                  const observer = new IntersectionObserver((entries) => {
                      entries.forEach(entry => {
                          if (entry.isIntersecting) {
                              entry.target.classList.remove('hidden');
                              entry.target.classList.add('fade-in');
                              observer.unobserve(entry.target);
                          }
                      });
                  }, { threshold: 0.1 });
                  observer.observe(jobDiv);
              });

              logAction('viewPopularJobs', { jobCount: popularJobs.length, jobIds: popularJobs.map(job => job.id) });
          }

          const categoryCards = document.querySelectorAll('.category-card');
          categoryCards.forEach(card => {
              card.addEventListener('click', () => {
                  const category = card.dataset.category;
                  window.location.href = `jobs.html?category=${encodeURIComponent(category)}`;
                  logAction('clickCategoryCard', { category });
              });
          });
      });
  } else if (document.getElementById('job-listings')) {
      restrictToLoggedIn(() => {
          trackPageView('Job Listings');
          const categorySelect = document.getElementById('category-select');
          if (categorySelect) {
              categorySelect.innerHTML = `
                  <option value="all">전체 직군</option>
                  ${[...new Set(jobs.map(job => job.category))].map(cat => `<option value="${cat}">${cat}</option>`).join('')}
              `;
              categorySelect.removeEventListener('change', handleCategoryChange);
              categorySelect.addEventListener('change', handleCategoryChange);
              function handleCategoryChange(e) {
                  const selectedCategory = e.target.value;
                  displayJobs(selectedCategory);
                  displayRecommendations(selectedCategory);
                  if (typeof showRecommendedJobsModal === 'function') {
                      showRecommendedJobsModal(); // 지연 시간 제거
                  } else {
                      console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
                      logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
                  }
                  logAction('changeCategory', { selectedCategory });
              }

              const urlParams = new URLSearchParams(window.location.search);
              const category = urlParams.get('category');
              console.log('URL Parameter - Raw Category:', category);
              const decodedCategory = category ? decodeURIComponent(category) : null;
              console.log('URL Parameter - Decoded Category:', decodedCategory);

              if (decodedCategory && [...new Set(jobs.map(job => job.category))].includes(decodedCategory)) {
                  categorySelect.value = decodedCategory;
                  console.log('Setting categorySelect value to:', decodedCategory);
                  displayJobs(decodedCategory);
                  displayRecommendations(decodedCategory);
              } else {
                  console.log('No valid category found, displaying all jobs');
                  categorySelect.value = 'all';
                  displayJobs('all');
                  displayRecommendations('all');
              }
          } else {
              console.log('No category select found, displaying all jobs');
              displayJobs('all');
              displayRecommendations('all');
          }

          handleAdvancedSearch(document.getElementById('job-listings'));
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
              searchInput.addEventListener('input', (e) => {
                  searchJobs(e.target.value, document.getElementById('job-listings'));
              });
          }

          const recommendedModal = document.getElementById('preferred-recommended-modal');
          if (recommendedModal) {
              if (typeof showRecommendedJobsModal === 'function') {
                  showRecommendedJobsModal(); // 지연 시간 제거
              } else {
                  console.error('showRecommendedJobsModal 함수가 정의되지 않았습니다.');
                  logAction('error', { message: 'showRecommendedJobsModal 함수가 정의되지 않음' });
              }
          }
      });
  } else if (document.getElementById('analytics')) {
      restrictToLoggedIn(() => {
          trackPageView('Analytics Dashboard');
          handleAdminAuth();
      });
  } else if (document.getElementById('job-detail')) {
      restrictToLoggedIn(() => {
          trackPageView('Job Detail');
          displayJobDetail();
      });
  }
});