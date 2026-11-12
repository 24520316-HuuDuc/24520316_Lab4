
import { useMemo, useState } from "react";
import { Search, Trophy, ArrowUpDown } from "lucide-react";
import { initialTeams } from "../data/teams";

export default function Leaderboard() {
  const [search, setSearch] = useState("");
  const [minWwcd, setMinWwcd] = useState("all");
  const [sortBy, setSortBy] = useState("totalPoints");
  const [sortOrder, setSortOrder] = useState("desc");

  const teams = useMemo(() => {
    return initialTeams
      .map((team) => ({
        ...team,
        totalPoints: team.placementPoints + team.killPoints,
      }))
      .filter((team) => {
        const matchesSearch =
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          team.tag.toLowerCase().includes(search.toLowerCase());

        const matchesWwcd =
          minWwcd === "all" || team.wwcd >= Number(minWwcd);

        return matchesSearch && matchesWwcd;
      })
      .sort((a, b) => {
        const result = b[sortBy] - a[sortBy];
        return sortOrder === "desc" ? result : -result;
      });
  }, [search, minWwcd, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((current) =>
        current === "desc" ? "asc" : "desc"
      );
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <section className="leaderboard-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMPETITIVE RANKING</span>
          <h2>PUBG Vietnam Leaderboard</h2>
          <p>Bảng xếp hạng thành tích các đội tuyển.</p>
        </div>

        <Trophy size={34} className="claim-gift-icon" />
      </div>

      <div className="leaderboard-controls">
        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm đội tuyển..."
          />
        </div>

        <select
          value={minWwcd}
          onChange={(event) => setMinWwcd(event.target.value)}
        >
          <option value="all">Tất cả WWCD</option>
          <option value="1">Ít nhất 1 WWCD</option>
          <option value="2">Ít nhất 2 WWCD</option>
          <option value="3">Ít nhất 3 WWCD</option>
          <option value="4">Ít nhất 4 WWCD</option>
        </select>
      </div>

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>TEAM</th>
              <th>
                <button onClick={() => handleSort("wwcd")}>
                  WWCD <ArrowUpDown size={13} />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("placementPoints")}>
                  PLACEMENT <ArrowUpDown size={13} />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("killPoints")}>
                  KILLS <ArrowUpDown size={13} />
                </button>
              </th>
              <th>
                <button onClick={() => handleSort("totalPoints")}>
                  TOTAL <ArrowUpDown size={13} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {teams.map((team, index) => (
              <tr key={team.id}>
                <td className="rank-cell">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td>
                  <div className="team-cell">
                    <span className="team-tag">{team.tag}</span>
                    <strong>{team.name}</strong>
                  </div>
                </td>
                <td>{team.wwcd}</td>
                <td>{team.placementPoints}</td>
                <td>{team.killPoints}</td>
                <td className="total-cell">{team.totalPoints}</td>
              </tr>
            ))}

            {teams.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-result">
                  Không tìm thấy đội tuyển phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="leaderboard-note">
        * Dữ liệu đội tuyển hiện là dữ liệu demo phục vụ kiểm thử.
      </p>
    </section>
  );
}
