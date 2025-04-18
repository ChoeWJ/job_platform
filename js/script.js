// script.js 상단에서 jobs 정의 제거하고 임포트 추가
import { jobs, loadJobs, addJob, deleteJob } from '../data/jobs.js';




// Select elements (상단 수정)
const categorySelect = document.getElementById('category-select');
const jobListings = document.getElementById('job-listings');
const recommendations = document.getElementById('recommendations');
const recommendationList = document.getElementById('recommendation-list');
const notificationModal = document.getElementById('notification-modal');
const notificationJobs = document.getElementById('notification-jobs');
const closeNotification = document.querySelector('.close-notification');
const recommendedModal = document.getElementById('recommended-modal'); // 추가

// Close recommended modal on outside click (줄 225 근처 수정)
if (recommendedModal) {
    window.removeEventListener('click', handleRecommendedModalClick); // 중복 방지
    window.addEventListener('click', handleRecommendedModalClick);
    function handleRecommendedModalClick(event) {
        if (event.target === recommendedModal) {
            recommendedModal.classList.remove('show');
        }
    }
} else {
    console.warn('recommended-modal 요소를 찾을 수 없습니다.');
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
            targetElement.appendChild(jobDiv);
        });
    }, false); // 검색은 리디렉션 없이 제한
}

// displayJobs 수정
function displayJobs(category) {
    return restrictToLoggedIn(() => {
        const jobListings = document.getElementById('job-listings');
        if (!jobListings) {
            console.error('job-listings 요소를 찾을 수 없습니다.');
            return;
        }

        jobListings.innerHTML = '';
        if (!jobs || jobs.length === 0) {
            handleError('공고 데이터를 로드할 수 없습니다.', 'job-listings');
            return;
        }

        const categories = category && category !== 'all'
            ? [category]
            : [...new Set(jobs.map(job => job.category))];

        categories.forEach(cat => {
            const section = document.createElement('section');
            section.className = 'category-section';
            section.innerHTML = `<h2>${cat}</h2><div id="jobs-${cat.replace(/\s/g, '-')}" class="category-jobs"></div>`;
            jobListings.appendChild(section);

            const categoryJobs = jobs.filter(job => job.category === cat);
            const jobsContainer = document.getElementById(`jobs-${cat.replace(/\s/g, '-')}`);
            if (categoryJobs.length === 0) {
                jobsContainer.innerHTML = '<p>해당 직군에 공고가 없습니다.</p>';
                return;
            }

            categoryJobs.forEach(job => {
                const jobDiv = document.createElement('div');
                jobDiv.className = 'job-card';
                jobDiv.innerHTML = `
                    <h3>${job.title} - ${job.company}</h3>
                    <p>연봉: ${job.salary}</p>
                    <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                    <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                `;
                jobsContainer.appendChild(jobDiv);
            });
        });
    });
}

// addFavoriteJob 정의 (누락 시 추가)
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
            alert('즐겨찾기에 추가되었습니다.');
        } else {
            alert('이미 즐겨찾기에 추가된 공고입니다.');
        }
    });
}

// displayJobDetail 수정 (즐겨찾기 버튼 추가)
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
            const favoriteButton = document.querySelector('.favorite-button'); // 즐겨찾기 버튼

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
                });
            }

            if (favoriteButton) {
                favoriteButton.addEventListener('click', () => {
                    addFavoriteJob(jobId); // addFavoriteJob 호출
                });
            }

            trackClick(job.category || '알 수 없음');
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
        // getTopClickedCategories 사용
        const recommendedCategories = getTopClickedCategories(3); // 상위 3개 직군
        let recJobs = [];
        recommendedCategories.forEach(recCat => {
            const catJobs = jobs.filter(job => job.category === recCat);
            recJobs = recJobs.concat(catJobs);
        });
        recJobs = recJobs.sort(() => 0.5 - Math.random()).slice(0, 3);

        if (recJobs.length > 0) {
            recJobs.forEach(job => {
                const recDiv = document.createElement('div');
                recDiv.innerHTML = `<p><a href="job-detail.html?id=${job.id}">${job.title} - ${job.company}</a></p>`;
                recommendationList.appendChild(recDiv);
            });
        } else {
            recommendationList.innerHTML = '<p>추천 공고가 없습니다.</p>';
        }
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
            jobDiv.innerHTML = `<p><a href="job-detail.html?id=${job.id}">${job.title} - ${job.company}</a></p>`;
            notificationJobs.appendChild(jobDiv);
        });
        notificationModal.classList.add('show');
    }
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

// Function to display recommended jobs on main page
function displayMainRecommendedJobs() {
    const recommendedJobList = document.getElementById('recommended-job-list');
    if (!recommendedJobList) {
        console.error('recommended-job-list 요소를 찾을 수 없습니다.');
        return;
    }

    recommendedJobList.innerHTML = '';
    const preferredCategory = localStorage.getItem('preferredCategory') || getMostClickedCategory();
    let recommendedJobs = getPopularJobsInCategory(preferredCategory);
    if (recommendedJobs.length === 0) {
        recommendedJobs = jobs.filter(job => job.category === preferredCategory);
    }
    recommendedJobs = recommendedJobs.sort(() => 0.5 - Math.random()).slice(0, 3);
    recommendedJobs.forEach(job => {
        if (job) {
            const jobDiv = document.createElement('div');
            jobDiv.className = 'job-card';
            jobDiv.innerHTML = `
                <h3>${job.title} - ${job.company}</h3>
                <p>연봉: ${job.salary}</p>
                <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
            `;
            recommendedJobList.appendChild(jobDiv);
        }
    });
}

// showRecommendedJob 함수 수정
function showRecommendedJob() {
    const recommendedModal = document.getElementById('recommended-modal');
    const recommendedJob = document.getElementById('recommended-job');
    if (!recommendedModal || !recommendedJob) {
        console.warn('recommended-modal 또는 recommended-job 요소를 찾을 수 없습니다.');
        return;
    }
    recommendedJob.innerHTML = '';
    const preferredCategory = localStorage.getItem('preferredCategory') || getMostClickedCategory();
    let recommendedJobs = getPopularJobsInCategory(preferredCategory);
    if (recommendedJobs.length === 0) {
        recommendedJobs = jobs.filter(job => job.category === preferredCategory);
    }
    const selectedJob = recommendedJobs[Math.floor(Math.random() * recommendedJobs.length)];
    if (selectedJob) {
        const jobDiv = document.createElement('div');
        jobDiv.innerHTML = `
            <p><a href="job-detail.html?id=${selectedJob.id}">${selectedJob.title} - ${selectedJob.company}</a></p>
            <p>연봉: ${selectedJob.salary}</p>
            <p>원격 근무: ${selectedJob.remote ? '가능' : '불가능'}</p>
        `;
        recommendedJob.appendChild(jobDiv);
        recommendedModal.classList.add('show');
    }
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

// Track click data
function trackClick(category) {
    let clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
    clickData[category] = (clickData[category] || 0) + 1;
    localStorage.setItem('jobClicks', JSON.stringify(clickData));
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



// handleAdvancedSearch 수정
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
            }
        }

        if (closeAdvancedSearch) {
            closeAdvancedSearch.removeEventListener('click', closeModalHandler);
            closeAdvancedSearch.addEventListener('click', closeModalHandler);
            function closeModalHandler() {
                advancedSearchModal.classList.remove('show');
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
                    targetElement.appendChild(jobDiv);
                });

                advancedSearchModal.classList.remove('show');
                setTimeout(showRecommendedJob, 5000);
            }
        }

        advancedSearchModal.addEventListener('click', (event) => {
            if (event.target === advancedSearchModal) {
                advancedSearchModal.classList.remove('show');
            }
        });
    }, false); // 상세 검색은 리디렉션 없이 제한
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
        if (redirect) {
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
        }
        return false;
    }
    return callback();
}

// renderNavigation 수정 (비로그인 시 제한 UI)
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
            alert('로그아웃되었습니다.');
            window.location.href = 'main.html';
        });
        authButtonContainer.appendChild(logoutBtn);
    } else {
        const loginBtn = document.createElement('button');
        loginBtn.id = 'login-btn';
        loginBtn.className = 'detail-button';
        loginBtn.textContent = '로그인';
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
        authButtonContainer.appendChild(loginBtn);

        const signupBtn = document.createElement('button');
        signupBtn.id = 'signup-btn';
        signupBtn.className = 'detail-button';
        signupBtn.textContent = '회원가입';
        signupBtn.addEventListener('click', () => {
            window.location.href = 'signup.html';
        });
        authButtonContainer.appendChild(signupBtn);
    }
}

// 회원가입 페이지 처리
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
            alert('입력 필드가 누락되었습니다.');
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const agreeTerms = agreeTermsInput.checked;
        const result = handleSignup(email, password, confirmPassword, agreeTerms); // handleSignup 호출
        alert(result.message);
        if (result.success) {
            window.location.href = 'login.html';
        }
    });
}

// 로그인 페이지 처리
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
            alert('입력 필드가 누락되었습니다.');
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;
        if (handleLogin(email, password)) {
            alert('로그인 성공!');
            window.location.href = 'main.html';
        } else {
            alert('이메일 또는 비밀번호가 잘못되었습니다.');
        }
    });
}

// 로그인 관리
function handleLogin(email, password) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = { email: user.email, isAdmin: user.isAdmin || false };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return true;
    }
    return false;
}

// 로그아웃 관리
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

// 회원가입 (비밀번호 확인 및 약관 동의 추가)
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

// handleProfile 수정
function handleProfile() {
    return restrictToLoggedIn(() => {
        const preferredCategory = document.getElementById('preferred-category');
        const savePreferred = document.getElementById('save-preferred');
        const recentJobs = document.getElementById('recent-jobs');
        const resumeForm = document.getElementById('resume-form');
        const resumeDisplay = document.getElementById('resume-display');

        if (preferredCategory && savePreferred) {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.email === currentUser.email);
            if (user && user.preferredCategory) {
                preferredCategory.value = user.preferredCategory;
            }
            savePreferred.addEventListener('click', () => {
                if (preferredCategory.value) {
                    user.preferredCategory = preferredCategory.value;
                    localStorage.setItem('users', JSON.stringify(users));
                    alert('선호 직군이 저장되었습니다.');
                    displayMainRecommendedJobs();
                }
            });
        }

        if (recentJobs) {
            recentJobs.innerHTML = '';
            const clickData = JSON.parse(localStorage.getItem('jobClicksDetailed')) || [];
            const recentJobIds = [...new Set(clickData.map(click => click.jobId))].slice(0, 5);
            recentJobIds.forEach(jobId => {
                const job = jobs.find(j => j.id === jobId);
                if (job) {
                    const jobDiv = document.createElement('div');
                    jobDiv.className = 'job-card';
                    jobDiv.innerHTML = `
                        <h3>${job.title} - ${job.company}</h3>
                        <p>연봉: ${job.salary}</p>
                        <p>원격 근무: ${job.remote ? '가능' : '불가능'}</p>
                        <a href="job-detail.html?id=${job.id}" class="detail-button">상세 보기</a>
                    `;
                    recentJobs.appendChild(jobDiv);
                }
            });
        }

        if (resumeForm && resumeDisplay) {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.email === currentUser.email);
            if (user && user.resume) {
                resumeDisplay.innerHTML = `
                    <h4>저장된 이력서</h4>
                    <p><strong>이름:</strong> ${user.resume.name}</p>
                    <p><strong>이메일:</strong> ${user.resume.email}</p>
                    <p><strong>경력:</strong> ${user.resume.experience || '없음'}</p>
                    <p><strong>기술 및 자격:</strong> ${user.resume.skills || '없음'}</p>
                    <button id="delete-resume">이력서 삭제</button>
                `;
                const deleteResume = document.getElementById('delete-resume');
                if (deleteResume) {
                    deleteResume.addEventListener('click', () => {
                        user.resume = null;
                        localStorage.setItem('users', JSON.stringify(users));
                        resumeDisplay.innerHTML = '<p>이력서가 삭제되었습니다.</p>';
                    });
                }
            }
            resumeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const resumeData = {
                    name: document.getElementById('resume-name').value,
                    email: document.getElementById('resume-email').value,
                    experience: document.getElementById('resume-experience').value,
                    skills: document.getElementById('resume-skills').value
                };
                user.resume = resumeData;
                localStorage.setItem('users', JSON.stringify(users));
                resumeDisplay.innerHTML = `
                    <h4>저장된 이력서</h4>
                    <p><strong>이름:</strong> ${resumeData.name}</p>
                    <p><strong>이메일:</strong> ${resumeData.email}</p>
                    <p><strong>경력:</strong> ${resumeData.experience || '없음'}</p>
                    <p><strong>기술 및 자격:</strong> ${resumeData.skills || '없음'}</p>
                    <button id="delete-resume">이력서 삭제</button>
                `;
                resumeForm.reset();
                alert('이력서가 저장되었습니다.');
                const deleteResume = document.getElementById('delete-resume');
                if (deleteResume) {
                    deleteResume.addEventListener('click', () => {
                        user.resume = null;
                        localStorage.setItem('users', JSON.stringify(users));
                        resumeDisplay.innerHTML = '<p>이력서가 삭제되었습니다.</p>';
                    });
                }
            });
        }
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
        }
    } catch (error) {
        console.error('관리자 계정 초기화 실패:', error);
    }
}


// handleAdminAuth 수정
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
        } else {
            analyticsSection.style.display = 'block';
            displayAnalytics();
        }
        authSubmit.addEventListener('click', () => {
            if (adminPassword.value === 'admin123' && checkLogin() && currentUser.isAdmin) {
                authModal.classList.remove('show');
                analyticsSection.style.display = 'block';
                displayAnalytics();
            } else {
                authError.style.display = 'block';
            }
        });
        adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') authSubmit.click();
        });
    }
}

// displayAnalytics 함수 (중복 제거, 단일 정의)
function displayAnalytics() {
    const pvTableBody = document.querySelector('#pv-table tbody');
    const clickTableBody = document.querySelector('#click-table tbody');
    const userTableBody = document.querySelector('#user-table tbody');
    const jobTableBody = document.querySelector('#job-table tbody');

    if (pvTableBody && clickTableBody) {
        const pvData = JSON.parse(localStorage.getItem('pageViews')) || {};
        pvTableBody.innerHTML = '';
        for (let page in pvData) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${page}</td><td>${pvData[page]}</td>`;
            pvTableBody.appendChild(row);
        }
        const clickData = JSON.parse(localStorage.getItem('jobClicks')) || {};
        clickTableBody.innerHTML = '';
        for (let category in clickData) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${category}</td><td>${clickData[category]}</td>`;
            clickTableBody.appendChild(row);
        }
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
            });
        });
    }

    const addJobForm = document.getElementById('add-job-form');
    if (addJobForm) {
        addJobForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const job = {
                title: document.getElementById('job-title').value,
                category: document.getElementById('job-category').value,
                salary: document.getElementById('job-salary').value,
                remote: document.getElementById('job-remote').value === 'true',
                company: document.getElementById('job-company').value,
                description: document.getElementById('job-description').value,
                experience: document.getElementById('job-experience').value,
                requirements: document.getElementById('job-requirements').value.split(','),
                image: document.getElementById('job-image').value || 'https://via.placeholder.com/1350x200'
            };
            addJob(job);
            addJobForm.reset();
            displayAnalytics();
        });
    }
}

// 오류 처리 헬퍼 함수
function handleError(message, elementId) {
    console.error(message);
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<p>${message}</p>`;
    }
}

// DOMContentLoaded 초기화 수정
document.addEventListener('DOMContentLoaded', async () => {
    initializeAdminAccount();
    await loadJobs();

    if (!jobs || jobs.length === 0) {
        handleError('공고 데이터를 로드할 수 없습니다.', 'job-detail');
        handleError('공고 데이터를 로드할 수 없습니다.', 'job-listings');
        return;
    }

    renderNavigation();

    if (document.getElementById('login-form')) {
        handleLoginPage();
        return; // 로그인 페이지에서는 다른 기능 제한
    }

    if (document.getElementById('signup-form')) {
        handleSignupPage();
        return; // 회원가입 페이지에서는 다른 기능 제한
    }

    if (categorySelect) {
        restrictToLoggedIn(() => {
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
            }
            displayJobs('all');
        });
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
            setTimeout(showRecommendedJob, 5000);
        });
    } else if (document.getElementById('job-listings')) {
        restrictToLoggedIn(() => {
            trackPageView('Job Listings');
            displayJobs('all');
            displayRecommendations('all');
            handleAdvancedSearch(document.getElementById('job-listings'));
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    searchJobs(e.target.value, document.getElementById('job-listings'));
                });
            }
            setTimeout(showNotification, 10000);
        });
    } else if (document.getElementById('analytics')) {
        restrictToLoggedIn(() => {
            trackPageView('Analytics Dashboard');
            handleAdminAuth();
        });
    } else if (document.getElementById('profile')) {
        restrictToLoggedIn(() => {
            trackPageView('Profile Page');
            handleProfile();
        });
    } else if (document.getElementById('job-detail')) {
        restrictToLoggedIn(() => {
            trackPageView('Job Detail');
            displayJobDetail();
        });
    }
});

