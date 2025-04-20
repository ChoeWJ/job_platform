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
    const logs = JSON.parse(localStorage.getItem('userLogs')) || [];
    const email = currentUser ? currentUser.email : 'anonymous';
    logs.push({ email, action, details, timestamp: new Date().toISOString() });
    localStorage.setItem('userLogs', JSON.stringify(logs));
}

// NewsAPI를 활용한 실시간 뉴스 표시 로직
async function displayRealTimeNews() {
    const newsList = document.getElementById('news-list');
    if (!newsList) {
        console.warn('news-list 요소를 찾을 수 없습니다.');
        return;
    }

    const apiKey = 'd591f93e2ddd4bcaa21b714352153438';
    const keywords = ['employment', 'corporate'];
    let currentKeywordIndex = 0;
    let currentPage = 1;
    const maxDisplay = 3;

    async function fetchNews(keyword) {
        try {
            const response = await fetch(
                `https://newsapi.org/v2/everything?q=${keyword}&language=en&sortBy=publishedAt&apiKey=${apiKey}&page=${currentPage}&pageSize=${maxDisplay}`
            );
            const data = await response.json();
            if (data.status === 'ok' && data.articles) {
                return data.articles;
            } else {
                console.error('NewsAPI 호출 실패:', data);
                return [];
            }
        } catch (error) {
            console.error('NewsAPI 호출 중 오류:', error);
            return [];
        }
    }

    async function updateNews() {
        const keyword = keywords[currentKeywordIndex];
        const articles = await fetchNews(keyword);

        newsList.innerHTML = '';
        articles.forEach(article => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-card';
            newsItem.innerHTML = `
                <img src="${article.urlToImage || 'https://via.placeholder.com/150'}" alt="${article.title}" class="news-image">
                <div class="news-content">
                    <a href="${article.url}" target="_blank">${article.title}</a>
                    <p class="news-source">${article.source.name}</p>
                    <p class="news-description">${article.description || '설명 없음'}</p>
                </div>
            `;
            newsList.appendChild(newsItem);
        });

        currentKeywordIndex = (currentKeywordIndex + 1) % keywords.length;
        currentPage = currentKeywordIndex === 0 ? currentPage + 1 : currentPage;
    }

    await updateNews();
    setInterval(updateNews, 50000);
    logAction('viewNews', { keywords: keywords[currentKeywordIndex] });
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

// Track page views
function trackPageView(page) {
    let pvData = JSON.parse(localStorage.getItem('pageViews')) || {};
    pvData[page] = (pvData[page] || 0) + 1;
    localStorage.setItem('pageViews', JSON.stringify(pvData));
    logAction('pageView', { page });
}

// Track click data (jobId 전달 수정)
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

// searchJobs 수정
function searchJobs(query, targetElement) {
    return restrictToLoggedIn(() => {
        if (!targetElement) {
            console.error('검색 대상 요소를 찾을 수 없습니다.');
            return;
        }
        const filteredJobs = jobs.filter(job =>
            job.title.toLowerCase().includes(query.toLowerCase()) ||
            job.company.toLowerCase().includes(query.toLowerCase())
        );
        targetElement.innerHTML = '';
        if (filteredJobs.length === 0) {
            targetElement.innerHTML = '<p>검색 결과가 없습니다.</p>';
            return;
        }
        filteredJobs.forEach(job => {
            const jobDiv = document.createElement('div');
            jobDiv.className = 'job-card';
            jobDiv.innerHTML = `
                <h3>${job.title} - ${job.company}</h3>
                <p>연봉: ${job.salary}</p>
                <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
            `;
            jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                e.preventDefault();
                trackClick(job.category, job.id);
                window.location.href = `job-detail.html?id=${job.id}`;
            });
            targetElement.appendChild(jobDiv);
        });
        logAction('search', { query });
    }, false);
}

// displayJobs 함수 수정 (jobListings 변수 사용 보장)
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
  
      categories.forEach(cat => {
        const section = document.createElement('section');
        section.className = 'category-section';
        section.innerHTML = `<h2>${cat}</h2><div id="jobs-${cat.replace(/\s/g, '-')}" class="category-jobs"></div>`;
        jobListings.appendChild(section);
  
        const categoryJobs = jobs.filter(j => j.category === cat);
        const jobsContainer = document.getElementById(`jobs-${cat.replace(/\s/g, '-')}`);
        if (!jobsContainer) {
          console.warn(`jobs-${cat.replace(/\s/g, '-')} 요소를 찾을 수 없습니다.`);
          return;
        }
  
        if (categoryJobs.length === 0) {
          jobsContainer.innerHTML = '<p>해당 직군에 공고가 없습니다.</p>';
          return;
        }
  
        categoryJobs.forEach(job => {
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
          jobsContainer.appendChild(jobDiv);
        });
      });
  
      logAction('viewJobs', { category });
    });
  }

// addFavoriteJob 수정 (로그 추가)
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
            if (document.getElementById('favorite-jobs-list')) {
                handleProfile();
            }
            logAction('addFavorite', { jobId });
        }
    });
}

// displayJobDetail 수정 (trackClick에 jobId 전달)
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

            companyImage.style.backgroundImage = `url(${job.image || 'https://via.placeholder.com/1350x200'})`;
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

            if (applyButton) {
                applyButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('지원이 완료되었습니다.');
                    logAction('applyJob', { jobId });
                });
            }

            if (favoriteButton) {
                favoriteButton.addEventListener('click', () => {
                    addFavoriteJob(jobId);
                });
            }

            trackClick(job.category, job.id);
        } catch (error) {
            console.error('직무 데이터 렌더링 중 오류 발생:', error);
            jobDetail.innerHTML = '<p>데이터를 표시하는 데 문제가 발생했습니다.</p>';
        }
    });
}

// displayRecommendations 수정
function displayRecommendations(category) {
    return restrictToLoggedIn(() => {
        if (!recommendations || !recommendationList) {
            console.error('recommendations 또는 recommendation-list 요소를 찾을 수 없습니다.');
            return;
        }

        recommendationList.innerHTML = '';
        const recommendedCategories = getTopClickedCategories(3);
        let recJobs = [];
        recommendedCategories.forEach(recCat => {
            const catJobs = jobs.filter(job => job.category === recCat);
            recJobs = recJobs.concat(catJobs);
        });
        recJobs = recJobs.sort(() => 0.5 - Math.random()).slice(0, 3);

        if (recJobs.length > 0) {
            recJobs.forEach(job => {
                const recDiv = document.createElement('div');
                recDiv.innerHTML = `<p><a href="job-detail.html?id=${job.id}" class="detail-button">${job.title} - ${job.company}</a></p>`;
                recDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                    e.preventDefault();
                    trackClick(job.category, job.id);
                    window.location.href = `job-detail.html?id=${job.id}`;
                });
                recommendationList.appendChild(recDiv);
            });
        } else {
            recommendationList.innerHTML = '<p>추천 공고가 없습니다.</p>';
        }
        logAction('viewRecommendations', { category });
    });
}

// Function to show notification
function showNotification() {
    if (!notificationModal || !notificationJobs) return;
    const currentCategory = categorySelect ? categorySelect.value : 'all';
    notificationJobs.innerHTML = '';
    const recommendedCategories = recommendationMap[currentCategory] || [];
    let recJobs = [];
    recommendedCategories.forEach(recCat => {
        const catJobs = jobs.filter(job => job.category === recCat);
        recJobs = recJobs.concat(catJobs);
    });
    recJobs = recJobs.sort(() => 0.5 - Math.random()).slice(0, 3);
    if (recJobs.length > 0) {
        recJobs.forEach(job => {
            const jobDiv = document.createElement('div');
            jobDiv.innerHTML = `<p><a href="job-detail.html?id=${job.id}" class="detail-button">${job.title} - ${job.company}</a></p>`;
            jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                e.preventDefault();
                trackClick(job.category, job.id);
                window.location.href = `job-detail.html?id=${job.id}`;
            });
            notificationJobs.appendChild(jobDiv);
        });
        notificationModal.classList.add('show');
    }
    logAction('viewNotification', { category: currentCategory });
}

// Close notification
if (closeNotification) {
    closeNotification.onclick = () => notificationModal.classList.remove('show');
}

// Close notification on outside click
if (notificationModal) {
    window.onclick = function(event) {
        if (event.target === notificationModal) {
            notificationModal.classList.remove('show');
        }
    };
}

// displayMainRecommendedJobs 수정 (다중 선호 직군 기반 추천)
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
      let userSkills = user && user.resume && user.resume.skills ? user.resume.skills : [];
      let userExperience = user && user.resume && user.resume.experience ? parseInt(user.resume.experience) || 0 : 0;
  
      const userLogs = JSON.parse(localStorage.getItem('userLogs')) || [];
      const userClickLogs = userLogs.filter(log => log.email === currentUser.email && log.action === 'clickJob');
      const clickedCategories = [...new Set(userClickLogs.map(log => log.details.category))];
      const userApplyLogs = userLogs.filter(log => log.email === currentUser.email && log.action === 'applyJob');
      const appliedCategories = [...new Set(userApplyLogs.map(log => {
        const job = jobs.find(j => j.id === log.details.jobId);
        return job ? job.category : null;
      }).filter(cat => cat))];
      preferredCategories = [...new Set([...preferredCategories, ...clickedCategories, ...appliedCategories])];
  
      user.feedback = user.feedback || {};
      const userFeedback = user.feedback;
  
      let recommendedJobs = [];
      jobs.forEach(job => {
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
        recommendedJobs.push(job);
      });
  
      recommendedJobs = recommendedJobs.sort((a, b) => b.score - a.score).slice(0, 3);
  
      recommendedJobList.innerHTML = '';
      recommendedJobs.forEach(job => {
        if (job) {
          const jobDiv = document.createElement('div');
          jobDiv.className = 'job-card';
          jobDiv.innerHTML = `
            <h3>${job.title} - ${job.company}</h3>
            <p class="highlight">연봉: ${job.salary}</p>
            <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
            <p>추천 점수: ${job.score.toFixed(2)}</p>
            <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
            <button class="feedback-like" data-job-id="${job.id}">좋아요</button>
            <button class="feedback-dislike" data-job-id="${job.id}">싫어요</button>
          `;
          jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
            e.preventDefault();
            trackClick(job.category, job.id);
            window.location.href = `job-detail.html?id=${job.id}`;
          });
          jobDiv.querySelector('.feedback-like').addEventListener('click', () => {
            userFeedback[job.id] = 'like';
            localStorage.setItem('users', JSON.stringify(users));
            currentUser.feedback = userFeedback;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            displayMainRecommendedJobs();
            logAction('feedbackLike', { jobId: job.id });
          });
          jobDiv.querySelector('.feedback-dislike').addEventListener('click', () => {
            userFeedback[job.id] = 'dislike';
            localStorage.setItem('users', JSON.stringify(users));
            currentUser.feedback = userFeedback;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            displayMainRecommendedJobs();
            logAction('feedbackDislike', { jobId: job.id });
          });
          recommendedJobList.appendChild(jobDiv);
        }
      });
  
      logAction('viewMainRecommendedJobs', {
        categories: preferredCategories,
        recommendedJobIds: recommendedJobs.map(job => job.id)
      });
    });
  }

// Close recommended modal
const closeRecommended = document.querySelector('.close-recommended');
if (closeRecommended) {
    closeRecommended.onclick = () => document.getElementById('recommended-modal')?.classList.remove('show');
}

// Close recommended modal on outside click
if (recommendedModal) {
    window.addEventListener('click', (event) => {
        if (event.target === recommendedModal) {
            recommendedModal.classList.remove('show');
        }
    });
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
    const sortedJobs = Object.keys(jobClickCounts).sort((a, b) => jobClickCounts[b] - jobClickCounts[a]);
    return sortedJobs.map(id => jobs.find(job => job.id === parseInt(id))).filter(job => job);
}

// Get most clicked category
function getMostClickedCategory() {
    const preferredCategory = localStorage.getItem('preferredCategory');
    if (preferredCategory) return preferredCategory;
    const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    let maxCategory = "데이터 과학 및 분석";
    let maxClicks = 0;
    for (let category in clickData) {
        if (clickData[category] > maxClicks) {
            maxClicks = clickData[category];
            maxCategory = category;
        }
    }
    return maxCategory;
}

// Get top N clicked categories
function getTopClickedCategories(n) {
    const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    const sortedCategories = Object.keys(clickData).sort((a, b) => clickData[b] - clickData[a]);
    return sortedCategories.slice(0, n).length > 0 ? sortedCategories.slice(0, n) : ["데이터 과학 및 분석"];
}

// handleAdvancedSearch 수정 (로그 추가)
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
                logAction('openAdvancedSearch', {});
            }
        }

        if (closeAdvancedSearch) {
            closeAdvancedSearch.removeEventListener('click', closeModalHandler);
            closeAdvancedSearch.addEventListener('click', closeModalHandler);
            function closeModalHandler() {
                advancedSearchModal.classList.remove('show');
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

                const filteredJobs = jobs.filter(job => {
                    const salary = parseInt(job.salary.replace(/[^0-9]/g, '') || '0');
                    const matchesSalary = (!salaryDisclosed || job.salary !== '0') &&
                        (salary >= salaryMin) &&
                        (salary <= salaryMax);
                    const matchesRemote = remote === 'all' ||
                        (remote === 'true' && job.remote) ||
                        (remote === 'false' && !job.remote);
                    const matchesCategory = category === 'all' || job.category === category;
                    return matchesSalary && matchesRemote && matchesCategory;
                });

                targetElement.innerHTML = '';
                filteredJobs.forEach(job => {
                    const jobDiv = document.createElement('div');
                    jobDiv.className = 'job-card';
                    jobDiv.innerHTML = `
                        <h3>${job.title} - ${job.company}</h3>
                        <p>연봉: ${job.salary}</p>
                        <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                        <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                    `;
                    jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                        e.preventDefault();
                        trackClick(job.category, job.id);
                        window.location.href = `job-detail.html?id=${job.id}`;
                    });
                    targetElement.appendChild(jobDiv);
                });

                advancedSearchModal.classList.remove('show');
                setTimeout(showRecommendedJob, 5000);
                logAction('submitAdvancedSearch', { salaryDisclosed, salaryMin, salaryMax, remote, category });
            }
        }

        advancedSearchModal.addEventListener('click', (event) => {
            if (event.target === advancedSearchModal) {
                advancedSearchModal.classList.remove('show');
                logAction('closeAdvancedSearchOutside', {});
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

// renderNavigation (로그 추가)
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
    navRight.insertBefore(authButtonContainer, navRight.querySelector('.search-container'));

    if (checkLogin()) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'detail-button';
        logoutBtn.textContent = '로그아웃';
        logoutBtn.addEventListener('click', () => {
            handleLogout();
            window.location.href = 'main.html';
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

// handleSignupPage 수정 (로그 추가)
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

// handleLoginPage 수정 (로그 추가)
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
        const email = emailInput.value;
        const password = passwordInput.value;
        if (handleLogin(email, password)) {
            window.location.href = 'main.html';
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

// handleLogin 수정 (로그 추가)
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

        logAction('login', { email });
        return true;
    }
    return false;
}

// 로그아웃 관리 (로그 추가)
function handleLogout() {
    const email = currentUser ? currentUser.email : 'anonymous';
    currentUser = null;
    localStorage.removeItem('currentUser');
    logAction('logout', { email });
}

// handleSignup 수정 (로그 추가)
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

// handleProfile (로그 추가)
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
              <button class="remove-category" data-category="${category}">제거</button>
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
  
// 관리자 계정 초기화 (로그 추가)
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

// handleAdminAuth 수정 (로그 추가)
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

// displayAnalytics 함수 (Chart.js datalabels 적용, 로그 추가)
function displayAnalytics() {
    const pvTableBody = document.querySelector('#pv-table tbody');
    const clickTableBody = document.querySelector('#click-table tbody');
    const userTableBody = document.querySelector('#user-table tbody');
    const jobTableBody = document.querySelector('#job-table tbody');
    const jobClicksTableBody = document.querySelector('#job-clicks-table tbody');
    const companyJobsTableBody = document.querySelector('#company-jobs-table tbody');
    const pvChartCanvas = document.getElementById('pv-chart');
    const mauDauChartCanvas = document.getElementById('mau-dau-chart');
    const jobClicksRankingChartCanvas = document.getElementById('job-clicks-ranking-chart');
    const categoryRankingChartCanvas = document.getElementById('category-ranking-chart');
    const aarrrChartCanvas = document.getElementById('aarrr-chart');
  
    const userLogs = JSON.parse(localStorage.getItem('userLogs')) || [];
    const now = new Date();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
  
    const acquisitionUsers = new Set(
      userLogs
        .filter(log => log.action === 'login' && (now - new Date(log.timestamp)) <= oneMonth)
        .map(log => log.email)
    );
    const acquisitionCount = acquisitionUsers.size;
  
    const activationUsers = new Set(
      userLogs
        .filter(log => ['clickJob', 'applyJob'].includes(log.action) && (now - new Date(log.timestamp)) <= oneMonth)
        .map(log => log.email)
    );
    const activationCount = activationUsers.size;
  
    const applyLogs = userLogs.filter(log => log.action === 'applyJob');
    const retentionUsers = new Set();
    applyLogs.forEach((log, index) => {
      const jobId = log.details.jobId;
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;
      const category = job.category;
      const logTime = new Date(log.timestamp);
      const userAppliesInCategory = applyLogs.filter(l =>
        l.email === log.email &&
        jobs.find(j => j.id === l.details.jobId)?.category === category &&
        (new Date(l.timestamp) - logTime) <= oneMonth &&
        (new Date(l.timestamp) > logTime)
      );
      if (userAppliesInCategory.length > 0) {
        retentionUsers.add(log.email);
      }
    });
    const totalApplyUsers = new Set(applyLogs.map(log => log.email)).size;
    const retentionRate = totalApplyUsers > 0 ? (retentionUsers.size / totalApplyUsers) * 100 : 0;
  
    const referralCount = userLogs.filter(log =>
      ['addFavorite', 'showRecommendedJobsModal'].includes(log.action) &&
      (now - new Date(log.timestamp)) <= oneMonth
    ).length;
  
    const applyCount = userLogs.filter(log => log.action === 'applyJob' && (now - new Date(log.timestamp)) <= oneMonth).length;
    const clickCount = userLogs.filter(log => log.action === 'clickJob' && (now - new Date(log.timestamp)) <= oneMonth).length;
    const conversionRate = clickCount > 0 ? (applyCount / clickCount) * 100 : 0;
  
    if (aarrrChartCanvas) {
      const existingAarrrChart = Chart.getChart(aarrrChartCanvas);
      if (existingAarrrChart) existingAarrrChart.destroy();
  
      const ctxAarrr = aarrrChartCanvas.getContext('2d');
      new Chart(ctxAarrr, {
        type: 'bar',
        data: {
          labels: ['획득(명)', '활성화(명)', '유지(%)', '추천(건)', '전환율(%)'],
          datasets: [{
            label: 'AARRR 지표 (최근 30일)',
            data: [acquisitionCount, activationCount, retentionRate, referralCount, conversionRate],
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true, title: { display: true, text: '값' } },
            x: { title: { display: true, text: '지표' } }
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: (value, context) => context.dataIndex === 2 || context.dataIndex === 4 ? `${value.toFixed(1)}%` : value,
              font: { weight: 'bold' }
            }
          }
        }
      });
    }
  
    if (jobClicksTableBody) {
      const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
      const jobClickCounts = {};
      allUsersClicks.forEach(click => {
        jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
      });
  
      jobClicksTableBody.innerHTML = '';
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
  
      if (jobClicksRankingChartCanvas) {
        const sortedJobs = Object.keys(jobClickCounts).sort((a, b) => jobClickCounts[b] - jobClickCounts[a]).slice(0, 5);
        const labels = [];
        const data = [];
        sortedJobs.forEach(jobId => {
          const job = jobs.find(j => j.id === parseInt(jobId));
          if (job) {
            labels.push(`${job.title} (${job.company})`);
            data.push(jobClickCounts[jobId]);
          }
        });
  
        const existingJobClicksChart = Chart.getChart(jobClicksRankingChartCanvas);
        if (existingJobClicksChart) existingJobClicksChart.destroy();
  
        const ctxJobClicks = jobClicksRankingChartCanvas.getContext('2d');
        new Chart(ctxJobClicks, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: '공고별 조회수 (상위 5개)',
              data: data,
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              y: { beginAtZero: true, title: { display: true, text: '조회수' } },
              x: { title: { display: true, text: '공고' } }
            },
            plugins: {
              datalabels: {
                anchor: 'end',
                align: 'top',
                formatter: value => value,
                font: { weight: 'bold' }
              }
            }
          }
        });
      }
    }
  
    if (clickTableBody && categoryRankingChartCanvas) {
      const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
      clickTableBody.innerHTML = '';
      for (let category in clickData) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${category}</td><td>${clickData[category]}</td>`;
        clickTableBody.appendChild(row);
      }
  
      const totalClicks = Object.values(clickData).reduce((sum, val) => sum + val, 0);
      const sortedCategories = Object.keys(clickData).sort((a, b) => clickData[b] - clickData[a]).slice(0, 5);
      const categoryLabels = sortedCategories;
      const categoryData = sortedCategories.map(cat => clickData[cat]);
  
      const existingCategoryChart = Chart.getChart(categoryRankingChartCanvas);
      if (existingCategoryChart) existingCategoryChart.destroy();
  
      const ctxCategory = categoryRankingChartCanvas.getContext('2d');
      new Chart(ctxCategory, {
        type: 'pie',
        data: {
          labels: categoryLabels,
          datasets: [{
            label: '직군별 클릭 수 (상위 5개)',
            data: categoryData,
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            legend: { position: 'right' },
            datalabels: {
              formatter: (value, context) => {
                const percentage = totalClicks > 0 ? ((value / totalClicks) * 100).toFixed(1) : 0;
                return `${value} (${percentage}%)`;
              },
              color: '#fff',
              font: { weight: 'bold' },
              anchor: 'center',
              align: 'center'
            }
          }
        }
      });
    }
  
    if (companyJobsTableBody) {
      const companyJobCounts = {};
      jobs.forEach(job => {
        companyJobCounts[job.company] = (companyJobCounts[job.company] || 0) + 1;
      });
  
      companyJobsTableBody.innerHTML = '';
      for (let company in companyJobCounts) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${company}</td>
          <td>${companyJobCounts[company]}</td>
        `;
        companyJobsTableBody.appendChild(row);
      }
    }
  
    if (pvTableBody && pvChartCanvas) {
      const pvData = JSON.parse(localStorage.getItem('pageViews')) || {};
      pvTableBody.innerHTML = '';
      for (let page in pvData) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${page}</td><td>${pvData[page]}</td>`;
        pvTableBody.appendChild(row);
      }
  
      const existingPvChart = Chart.getChart(pvChartCanvas);
      if (existingPvChart) existingPvChart.destroy();
  
      const ctxPv = pvChartCanvas.getContext('2d');
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
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: value => value,
              font: { weight: 'bold' }
            }
          }
        }
      });
    }
  
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
          },
          plugins: {
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: value => value,
              font: { weight: 'bold' }
            }
          }
        }
      });
    }
  
    if (userTableBody) {
      const users = JSON.parse(localStorage.getItem('users')) || [];
      userTableBody.innerHTML = '';
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
  
    if (jobTableBody) {
      jobTableBody.innerHTML = '';
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

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
        if (checkLogin()) {
            window.location.href = 'main.html';
        } else {
            window.location.href = 'login.html';
        }
        logAction('rootRedirect', { to: checkLogin() ? 'main.html' : 'login.html' });
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
        handleLoginPage();
        return;
    }

    if (document.getElementById('signup-form')) {
        handleSignupPage();
        return;
    }

    if (document.getElementById('profile')) {
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
                    setTimeout(showRecommendedJob, 5000);
                });
            }
            if (document.getElementById('recommended-modal')) {
                setTimeout(showRecommendedJob, 5000);
            }
            showRecommendedJobsModal();
            displayRealTimeNews();

            const popularJobList = document.getElementById('popular-job-list');
            if (popularJobList) {
                const allUsersClicks = JSON.parse(localStorage.getItem('allUsersClicks')) || [];
                const jobClickCounts = {};
                allUsersClicks.forEach(click => {
                    jobClickCounts[click.jobId] = (jobClickCounts[click.jobId] || 0) + 1;
                });

                let popularJobs = [];
                if (Object.keys(jobClickCounts).length > 0) {
                    popularJobs = Object.keys(jobClickCounts)
                        .sort((a, b) => jobClickCounts[b] - jobClickCounts[a])
                        .slice(0, 3)
                        .map(jobId => jobs.find(job => job.id === parseInt(jobId)))
                        .filter(job => job);
                }

                if (popularJobs.length === 0) {
                    popularJobs = jobs.slice(0, 3);
                }

                popularJobList.innerHTML = '';
                popularJobs.forEach(job => {
                    const jobDiv = document.createElement('div');
                    jobDiv.className = 'job-card';
                    jobDiv.innerHTML = `
                        <h3>${job.title} - ${job.company}</h3>
                        <p>연봉: ${job.salary}</p>
                        <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                        <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                    `;
                    jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                        e.preventDefault();
                        trackClick(job.category, job.id);
                        window.location.href = `job-detail.html?id=${job.id}`;
                    });
                    popularJobList.appendChild(jobDiv);
                });
            }
        });
    } else if (document.getElementById('job-listings')) {
        restrictToLoggedIn(() => {
            trackPageView('Job Listings');
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
                    setTimeout(showNotification, 5000);
                    logAction('changeCategory', { selectedCategory });
                }
            }
            displayJobs('all');
            displayRecommendations('all');
            handleAdvancedSearch(document.getElementById('job-listings'));
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    searchJobs(e.target.value, document.getElementById('job-listings'));
                });
            }
            if (document.getElementById('recommended-modal')) {
                setTimeout(showRecommendedJob, 10000);
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

// removeFavoriteJob 수정 (로그 추가)
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
        handleProfile();
        logAction('removeFavorite', { jobId });
    });
}

// removePreferredCategory 함수 (로그 추가)
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

// showRecommendedJobsModal 함수 수정 (trackClick 추가)
function showRecommendedJobsModal() {
    return restrictToLoggedIn(() => {
      const recommendedModal = document.getElementById('preferred-recommended-modal');
      const recommendedJobs = document.getElementById('preferred-recommended-jobs');
      const closeRecommended = document.querySelector('.close-preferred-recommended');
  
      if (!recommendedModal || !recommendedJobs) {
        console.warn('showRecommendedJobsModal - preferred-recommended-modal 또는 preferred-recommended-jobs 요소를 찾을 수 없습니다.');
        return;
      }
  
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === currentUser.email);
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
  
      setTimeout(() => {
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
          recommendedJobsList.forEach(job => {
            if (job) {
              const jobDiv = document.createElement('div');
              jobDiv.className = 'job-card';
              jobDiv.innerHTML = `
                <h3>${job.title} - ${job.company}</h3>
                <p class="highlight">연봉: ${job.salary}</p>
                <p class="highlight">원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                <p>추천 점수: ${job.score.toFixed(2)}</p>
                <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                <button class="feedback-like" data-job-id="${job.id}">좋아요</button>
                <button class="feedback-dislike" data-job-id="${job.id}">싫어요</button>
              `;
              jobDiv.querySelector('.detail-button').addEventListener('click', (e) => {
                e.preventDefault();
                trackClick(job.category, job.id);
                window.location.href = `job-detail.html?id=${job.id}`;
              });
              jobDiv.querySelector('.feedback-like').addEventListener('click', () => {
                userFeedback[job.id] = 'like';
                localStorage.setItem('users', JSON.stringify(users));
                currentUser.feedback = userFeedback;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showRecommendedJobsModal();
                logAction('feedbackLike', { jobId: job.id });
              });
              jobDiv.querySelector('.feedback-dislike').addEventListener('click', () => {
                userFeedback[job.id] = 'dislike';
                localStorage.setItem('users', JSON.stringify(users));
                currentUser.feedback = userFeedback;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showRecommendedJobsModal();
                logAction('feedbackDislike', { jobId: job.id });
              });
              recommendedJobs.appendChild(jobDiv);
            }
          });
  
          recommendedModal.classList.add('show');
          recommendedModal.style.display = 'block';
  
          window.removeEventListener('click', handleRecommendedModalClick);
          window.addEventListener('click', handleRecommendedModalClick);
  
          function handleRecommendedModalClick(event) {
            if (event.target === recommendedModal) {
              recommendedModal.classList.remove('show');
              recommendedModal.style.display = 'none';
              logAction('closeRecommendedModalOutside', {});
            }
          }
  
          if (closeRecommended) {
            closeRecommended.addEventListener('click', () => {
              recommendedModal.classList.remove('show');
              recommendedModal.style.display = 'none';
              logAction('closeRecommendedModal', {});
            });
          }
        }
  
        logAction('showRecommendedJobsModal', {
          jobCount: recommendedJobsList.length,
          recommendedJobIds: recommendedJobsList.map(job => job.id),
          delay: delay
        });
      }, delay);
    });
  }