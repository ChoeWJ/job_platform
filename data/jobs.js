// data/jobs.js
let jobs = [];

async function loadJobs() {
    try {
        // 경로 확인, 프로젝트 루트 기준
        const response = await fetch('./data/jobs.json');
        if (!response.ok) throw new Error(`jobs.json 로드 실패: ${response.status}`);
        jobs = await response.json();
        if (!Array.isArray(jobs) || jobs.length === 0) throw new Error('jobs 데이터가 비어 있습니다.');
        console.log('jobs 데이터 로드 성공:', jobs.length, '개');
        return jobs;
    } catch (error) {
        console.error('jobs 데이터 로드 오류:', error);
        // 대체 데이터
        jobs = [
            {
                id: 1,
                title: "소프트웨어 엔지니어",
                category: "소프트웨어 개발",
                salary: "10,000만원",
                remote: true,
                company: "테크콥",
                description: "소프트웨어 개발팀에서 새로운 기능 개발 및 유지보수 담당",
                experience: "3년 이상",
                requirements: ["Java, Python 등 프로그래밍 언어 숙련", "Git 사용 경험", "팀 협업 능력"],
                image: "https://via.placeholder.com/1350x200"
            }
        ];
        console.warn('대체 데이터 사용:', jobs);
        return jobs;
    }
}

function addJob(job) {
    const newId = jobs.length > 0 ? Math.max(...jobs.map(j => j.id)) + 1 : 1;
    job.id = newId;
    jobs.push(job);
    saveJobs();
}

function deleteJob(id) {
    jobs = jobs.filter(job => job.id !== id);
    saveJobs();
}

function saveJobs() {
    console.log('jobs 데이터 저장:', jobs);
}



export { jobs, loadJobs, addJob, deleteJob };